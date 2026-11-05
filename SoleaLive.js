// Soléa Live — choisir un arrêt dans l'app Scriptable ; le widget conserve le choix.
const URL="https://raw.githubusercontent.com/yroxdev/solea-live-iphone/main/public/departures.json";
const fm=FileManager.local();
const preference=fm.joinPath(fm.documentsDirectory(),"solea-live-preferences.json");
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
let prefs={stop:"Porte Jeune",favorites:["Porte Jeune"]};
try{if(fm.fileExists(preference))prefs={...prefs,...JSON.parse(fm.readString(preference))};}catch(e){}
const save=()=>fm.writeString(preference,JSON.stringify(prefs));
async function load(){
 const req=new Request(URL + "?refresh=" + Date.now());req.timeoutInterval=20;
 const raw=await req.loadString();
 if(req.response.statusCode!==200)throw Error("HTTP "+req.response.statusCode);
 return JSON.parse(raw);
}
async function choose(data){
 const names=[...new Set(Object.values(data.stops||{}))].sort((a,b)=>a.localeCompare(b,"fr"));
 let searching=true;
 while(searching){
  const menu=new Alert();menu.title="Soléa Live";menu.message="Arrêt actuel : "+prefs.stop;
  menu.addAction("🔎 Rechercher un arrêt");menu.addAction("⭐ Mes favoris");menu.addAction("Terminer");
  const choice=await menu.presentSheet();
  if(choice===2||choice<0)break;
  let matches=[];
  if(choice===0){
   const q=new Alert();q.title="Rechercher un arrêt";q.addTextField("Nom de l'arrêt","");
   q.addAction("Rechercher");q.addCancelAction("Annuler");
   if(await q.presentAlert()===-1)continue;
   const query=normalize(q.textFieldValue(0).trim());
   matches=names.filter(x=>normalize(x).includes(query)).slice(0,80);
  }else matches=(prefs.favorites||[]).filter(x=>names.includes(x));
  if(!matches.length){const emptyAlert=new Alert();emptyAlert.title="Aucun arrêt trouvé";emptyAlert.addAction("OK");await emptyAlert.presentAlert();continue;}
  const picker=new Alert();picker.title="Choisir un arrêt";picker.message=matches.length===80?"80 premiers résultats":matches.length+" résultat(s)";
  matches.forEach(x=>picker.addAction(x));picker.addCancelAction("Retour");
  const i=await picker.presentSheet();if(i<0)continue;
  prefs.stop=matches[i];prefs.favorites=[prefs.stop,...(prefs.favorites||[]).filter(x=>x!==prefs.stop)].slice(0,12);
  save();const ok=new Alert();ok.title="Arrêt enregistré";ok.message=prefs.stop+" sera affiché sur le widget.";ok.addAction("OK");await ok.presentAlert();
  searching=false;
 }
}
function add(p,s,n,color,bold=false){const x=p.addText(String(s));x.font=bold?Font.boldSystemFont(n):Font.systemFont(n);x.textColor=new Color(color);x.lineLimit=1;return x;}
async function widget(data){
 const stop=args.widgetParameter?.trim()||prefs.stop;
 const w=new ListWidget();w.backgroundColor=new Color("#111827");w.setPadding(15,15,15,15);
 add(w,"● SOLÉA LIVE",16,"#FFFFFF",true);w.addSpacer(5);add(w,stop,12,"#AAB6C8");w.addSpacer(12);
 const ids=Object.keys(data.stops||{}).filter(id=>normalize(data.stops[id])===normalize(stop));
 const matches=ids.length?ids:Object.keys(data.stops||{}).filter(id=>normalize(data.stops[id]).includes(normalize(stop)));
 let a=matches.flatMap(id=>data.departures[id]||[]).filter(d=>Date.parse(d.departure)>Date.now()-60000);
 a.sort((x,y)=>Date.parse(x.departure)-Date.parse(y.departure));
 const seen=new Set();a=a.filter(d=>{const k=d.line+"|"+d.destination+"|"+d.departure;if(seen.has(k))return false;seen.add(k);return true;});
 if(!a.length)add(w,"Aucun départ à venir",12,"#FFFFFF");
 for(const d of a.slice(0,config.widgetFamily==="small"?2:4)){
  const row=w.addStack();row.centerAlignContent();
  const b=row.addStack();b.backgroundColor=new Color("#E63950");b.cornerRadius=6;b.setPadding(5,8,5,8);
  add(b,d.line,12,"#FFFFFF",true);row.addSpacer(8);
  const detail=row.addStack();detail.layoutVertically();add(detail,d.destination||"Destination",11,"#FFFFFF",true);
  const date=new Date(d.departure);add(detail,date.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+(d.realtime?" · Réel":" · Prévu"),9,"#AAB6C8");
  row.addSpacer();add(row,Math.max(0,Math.ceil((date-Date.now())/60000))+" min",12,"#FFFFFF",true);w.addSpacer(9);
 }
 w.addSpacer();
 const age=Math.round((Date.now()-Date.parse(data.updated))/60000);
 add(w,"Données : "+age+" min · "+(data.realtime_feed==="available"?"GTFS-RT":"Théorique"),9,"#AAB6C8");
 if(age>30)add(w,"Attention : données anciennes",9,"#FFB4B4");
 w.url="scriptable:///run?scriptName="+encodeURIComponent(Script.name());
 w.refreshAfterDate=new Date(Date.now()+15*60000);
 return w;
}
try{
 const data=await load();
 if(!config.runsInWidget)await choose(data);
 const w=await widget(data);
 if(config.runsInWidget)Script.setWidget(w);else await w.presentMedium();
}catch(e){
 const w=new ListWidget();w.backgroundColor=new Color("#111827");
 add(w,"SOLÉA LIVE",16,"#FFFFFF",true);w.addSpacer(8);
 add(w,"Horaires indisponibles",12,"#FF7185",true);w.addSpacer(6);
 const t=add(w,e.message||e,10,"#FFFFFF");t.lineLimit=3;
 if(config.runsInWidget)Script.setWidget(w);else await w.presentMedium();
}
Script.complete();
