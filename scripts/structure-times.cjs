// One-time extraction; raw HTML remains intact for compatibility and comparison.
const fs=require('node:fs'),path=require('node:path');const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.resolve(__dirname,'..');const clock=s=>{const m=s.match(/(\d{1,2}):(\d{2})/);return m?`${m[1].padStart(2,'0')}:${m[2]}`:null};const min=s=>Number(s.slice(0,2))*60+Number(s.slice(3));
for(const id of ['europe-2026','alanya-2026']){
 const file=path.join(root,'data',id+'.json'),trip=JSON.parse(fs.readFileSync(file));trip.schemaVersion=2;trip.timeZone=id==='alanya-2026'?'Europe/Istanbul':'Europe/Berlin';let start=trip.start;
 for(const day of trip.days){const doc=new JSDOM(day.html).window.document;const departure=clock(doc.querySelector('.sub').textContent);let previous=min(departure),origin=start;const legs={};
 day.stops=[...doc.querySelectorAll('.step')].map((s,i,all)=>{const nav=new URL(s.querySelector('a.btn').href),destination=nav.searchParams.get('destination'),mode=nav.searchParams.get('travelmode')||'driving',meta=s.querySelector('.meta')?.textContent||'';const times=[...meta.matchAll(/\d{1,2}:\d{2}/g)].map(x=>clock(x[0]));const uncertain=/apie|kitą dieną/.test(meta);const terminal=i===all.length-1;const arrival=times[0]?min(times[0]):null;const visit=terminal?0:times.length===2&&!uncertain&&min(times[1])>=arrival?min(times[1])-arrival:null;
 const duration=arrival!==null&&previous!==null&&arrival>=previous&&!/apie/.test(meta)?arrival-previous:null;legs[JSON.stringify([mode,origin,destination])]={minutes:duration,source:'original-plan'};origin=destination;previous=visit!==null&&arrival!==null?arrival+visit:null;
 return {id:s.dataset.stopId,title:s.querySelector('.title').textContent,destination,mode,visitMinutes:visit,terminal,originalMeta:meta};});
 day.timing={departure,returnBy:id==='alanya-2026'?'19:00':null,bufferMinutes:id==='alanya-2026'?60:0,breakMinutes:0};day.start=start;day.end=day.stops.at(-1).destination;day.legs=legs;start=id==='alanya-2026'?trip.start:day.end;
 }
 fs.writeFileSync(file,JSON.stringify(trip,null,2)+'\n');
}
