// Soléa Live — Scriptable iOS. Paramètre du widget : nom de l'arrêt.
const STOP = args.widgetParameter || "Porte Jeune";
const URL = "https://raw.githubusercontent.com/yroxdev/solea-live-iphone/main/public/departures.json";
const w = new ListWidget();
w.backgroundColor = new Color("#111827");
w.setPadding(15,15,15,15);
function t(p,s,n,c,b=false){const x=p.addText(String(s));x.font=b?Font.boldSystemFont(n):Font.systemFont(n);x.textColor=new Color(c);x.lineLimit=1;return x;}
t(w,"● SOLÉA LIVE",16,"#FFFFFF",true);w.addSpacer(5);t(w,STOP,12,"#AAB6C8");w.addSpacer(12);
try {
 const req=new Request(URL);req.timeoutInterval=20;
 const raw=await req.loadString();
 if(req.response.statusCode!==200)throw Error("Données non publiées (HTTP "+req.response.statusCode+")");
 const data=JSON.parse(raw);
 const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const ids=Object.keys(data.stops||{}).filter(id=>norm(data.stops[id]).includes(norm(STOP)));
 if(!ids.length)throw Error("Arrêt introuvable");
 let a=ids.flatMap(id=>data.departures[id]||[]).filter(d=>Date.parse(d.departure)>Date.now()-60000);
 a.sort((x,y)=>Date.parse(x.departure)-Date.parse(y.departure));
 const seen=new Set();a=a.filter(d=>{const k=d.line+"|"+d.destination+"|"+d.departure;if(seen.has(k))return false;seen.add(k);return true;});
 if(!a.length)t(w,"Aucun départ à venir",12,"#FFFFFF");
 for(const d of a.slice(0,config.widgetFamily==="small"?2:4)){
  const row=w.addStack();row.centerAlignContent();
  const b=row.addStack();b.backgroundColor=new Color("#E63950");b.cornerRadius=6;b.setPadding(5,8,5,8);
  t(b,d.line,12,"#FFFFFF",true);row.addSpacer(8);
  const detail=row.addStack();detail.layoutVertically();t(detail,d.destination||"Destination",11,"#FFFFFF",true);
  const date=new Date(d.departure);t(detail,date.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+(d.realtime?" · Réel":" · Prévu"),9,"#AAB6C8");
  row.addSpacer();t(row,Math.max(0,Math.ceil((date-Date.now())/60000))+" min",12,"#FFFFFF",true);w.addSpacer(9);
 }
 w.addSpacer();
 const age=Math.round((Date.now()-Date.parse(data.updated))/60000);
 t(w,"Données : "+age+" min · "+(data.realtime_feed==="available"?"GTFS-RT":"Théorique"),9,"#AAB6C8");
 if(age>30)t(w,"Attention : données anciennes",9,"#FFB4B4");
}catch(e){t(w,"Horaires indisponibles",12,"#FF7185",true);w.addSpacer(6);const x=t(w,e.message||e,10,"#FFFFFF");x.lineLimit=3;}
w.refreshAfterDate=new Date(Date.now()+15*60000);
if(config.runsInWidget)Script.setWidget(w);else await w.presentMedium();
Script.complete();
