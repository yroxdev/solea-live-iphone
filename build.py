import csv,io,json,os,urllib.request,zipfile
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from google.transit import gtfs_realtime_pb2

TZ=ZoneInfo("Europe/Paris")
FEED="https://proxy.transport.data.gouv.fr/resource/solea-mulhouse-gtfs-rt"
ROOT=os.path.dirname(__file__)

def rows(z,name):
    return list(csv.DictReader(io.TextIOWrapper(z.open(name),encoding="utf-8-sig")))

def seconds(s):
    h,m,sec=map(int,s.split(":"))
    return h*3600+m*60+sec

def main():
    now=datetime.now(TZ)
    path=os.path.join(ROOT,"data","solea.gtfs.zip")
    if not os.path.isfile(path):
        raise RuntimeError("Fichier data/solea.gtfs.zip manquant : ajoutez le GTFS statique au dépôt")
    with zipfile.ZipFile(path) as z:
        names=set(z.namelist())
        stops=rows(z,"stops.txt")
        routes={r["route_id"]:r for r in rows(z,"routes.txt")}
        trips={r["trip_id"]:r for r in rows(z,"trips.txt")}
        calendar={r["service_id"]:r for r in rows(z,"calendar.txt")} if "calendar.txt" in names else {}
        exceptions={}
        if "calendar_dates.txt" in names:
            for r in rows(z,"calendar_dates.txt"):
                exceptions[(r["service_id"],r["date"])]=r["exception_type"]=="1"
        stop_names={r["stop_id"]:r["stop_name"] for r in stops}
        times=rows(z,"stop_times.txt")
    updates={}
    status="unavailable"
    try:
        req=urllib.request.Request(FEED,headers={"User-Agent":"SoleaLive/1.0"})
        with urllib.request.urlopen(req,timeout=25) as response:
            raw=response.read()
        feed=gtfs_realtime_pb2.FeedMessage()
        feed.ParseFromString(raw)
        for entity in feed.entity:
            if not entity.HasField("trip_update"): continue
            tu=entity.trip_update
            for st in tu.stop_time_update:
                ev=st.departure if st.HasField("departure") else st.arrival
                if ev.HasField("time") or ev.HasField("delay"):
                    updates[(tu.trip.trip_id,str(st.stop_sequence),st.stop_id)]={
                        "time":int(ev.time) if ev.HasField("time") else None,
                        "delay":int(ev.delay) if ev.HasField("delay") else None}
        status="available"
    except Exception as e:
        print("GTFS-RT unavailable:",repr(e))
    active={}
    for offset in (-1,0,1):
        day=(now+timedelta(days=offset)).date()
        date=day.strftime("%Y%m%d")
        weekday=day.strftime("%A").lower()
        services={sid for sid,r in calendar.items()
                  if r["start_date"]<=date<=r["end_date"] and r.get(weekday)=="1"}
        for (sid,d),enabled in exceptions.items():
            if d==date:
                if enabled: services.add(sid)
                else: services.discard(sid)
        active[offset]=services
    bystop={}
    for st in times:
        trip=trips.get(st["trip_id"])
        if not trip: continue
        for offset,services in active.items():
            if trip["service_id"] not in services: continue
            day=(now+timedelta(days=offset)).date()
            midnight=datetime(day.year,day.month,day.day,tzinfo=TZ)
            scheduled=midnight+timedelta(seconds=seconds(st["departure_time"]))
            if not now-timedelta(minutes=2)<=scheduled<=now+timedelta(hours=4): continue
            update=updates.get((st["trip_id"],st["stop_sequence"],st["stop_id"])) or updates.get((st["trip_id"],st["stop_sequence"],""))
            actual=scheduled
            realtime=False
            if update:
                if update["time"] is not None:
                    actual=datetime.fromtimestamp(update["time"],TZ);realtime=True
                elif update["delay"] is not None:
                    actual=scheduled+timedelta(seconds=update["delay"]);realtime=True
            if actual<now-timedelta(minutes=2): continue
            route=routes.get(trip["route_id"],{})
            bystop.setdefault(st["stop_id"],[]).append({
                "line":route.get("route_short_name","?"),
                "destination":trip.get("trip_headsign",""),
                "scheduled":scheduled.isoformat(),
                "departure":actual.isoformat(),
                "realtime":realtime})
    departures={sid:sorted(items,key=lambda x:x["departure"])[:30] for sid,items in bystop.items()}
    os.makedirs(os.path.join(ROOT,"public"),exist_ok=True)
    with open(os.path.join(ROOT,"public","departures.json"),"w",encoding="utf-8") as f:
        json.dump({"updated":now.isoformat(),"realtime_feed":status,"stops":stop_names,"departures":departures},f,ensure_ascii=False,separators=(",",":"))
    print("Stops with departures:",len(departures),"RT:",status)

if __name__=="__main__":main()
