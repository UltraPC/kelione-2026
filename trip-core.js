(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TripCore=api})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const PREFIX='kelione2026.',JOURNAL=PREFIX+'import.pending',PREVIOUS=PREFIX+'import.previous';
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const validMinutes=x=>Number.isFinite(x)&&x>=0&&x<=2880;
 const clock=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s)?Number(s.slice(0,2))*60+Number(s.slice(3)):null;
 const format=m=>{const day=Math.floor(m/1440),n=((Math.round(m)%1440)+1440)%1440;return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}${day>0?' (+'+day+' d.)':''}`};
 const legKey=(mode,from,to)=>JSON.stringify([mode,from,to]);
 function calculate({start,startMinutes,stops,end,endMode='driving',legs={},breakMinutes=0,stayMinutes=0,departureMinutes=0,returnMinutes=null,bufferMinutes=0}){
  if(!Number.isFinite(startMinutes)||!validMinutes(breakMinutes)||!validMinutes(stayMinutes)||!validMinutes(bufferMinutes))throw Error('Netinkami skaičiavimo laikai');
  let total=breakMinutes+stayMinutes,from=start;const missing=[],segments=[],arrivals=[];
  const travel=(destination,mode)=>{const key=legKey(mode,from,destination),estimate=legs[key];const minutes=from===destination?0:estimate?.minutes;
   segments.push({key,from,to:destination,mode,minutes:validMinutes(minutes)?minutes:null,source:from===destination?'same-place':estimate?.source||'unknown'});
   if(!validMinutes(minutes))missing.push({type:'leg',key,from,to:destination,mode});else total+=minutes;from=destination;
  };
  for(const stop of stops){travel(stop.destination,stop.mode||'driving');arrivals.push({id:stop.id,minutes:missing.length?null:startMinutes+total});if(!validMinutes(stop.visitMinutes))missing.push({type:'visit',id:stop.id,title:stop.title});else total+=stop.visitMinutes;}
  travel(end,endMode);
  const finish=missing.length?null:startMinutes+total;let deadline=returnMinutes;if(deadline!==null&&deadline<departureMinutes)deadline+=1440;
  const margin=finish!==null&&deadline!==null?deadline-finish:null;
  const status=missing.length?'incomplete':deadline===null?'no-deadline':margin<0?'late':margin<bufferMinutes?'low-buffer':'on-time';
  return {finish,knownMinutes:total,missing,segments,arrivals,deadline,margin,status};
 }
 function timingValid(value,trip,known){
  if(!object(value)||!object(value.days)||!object(value.legs))throw Error('Netinkami laiko duomenys');
  for(const [id,v] of Object.entries(value.days)){
   if(!trip.days.some(d=>d.id===id)||!object(v)||clock(v.departure)===null||(v.returnBy!==null&&clock(v.returnBy)===null)||!validMinutes(v.bufferMinutes)||!validMinutes(v.breakMinutes)||!object(v.visits))throw Error('Netinkami dienos laikai');
   for(const [sid,m] of Object.entries(v.visits))if(!known.has(sid)||!validMinutes(m))throw Error('Netinkama lankymo trukmė');
  }
  if(Object.keys(value.legs).length>5000)throw Error('Per daug atkarpų');
  for(const [key,v] of Object.entries(value.legs)){let tuple;try{tuple=JSON.parse(key)}catch{throw Error('Netinkama atkarpa')}
   if(!Array.isArray(tuple)||tuple.length!==3||!['driving','walking','bicycling','transit'].includes(tuple[0])||tuple.slice(1).some(x=>typeof x!=='string'||!x||x.length>1000)||!object(v)||!validMinutes(v.minutes)||!['manual','original-plan'].includes(v.source))throw Error('Netinkamas atkarpos įvertis');
  }
 }
 function validateBackup(input,trips){
  if(!object(input)||input.format!=='kelione2026-backup'||![1,2].includes(input.version)||!object(input.entries)||Object.keys(input.entries).length>500)throw Error('Neatpažintas atsarginės kopijos formatas');
  const entries=input.entries;for(const value of Object.values(entries))if(typeof value!=='string')throw Error('Netinkama kopijos reikšmė');
  const result=[];let recognized=new Set();
  for(const trip of trips){const p=PREFIX+trip.id+'.',names=['visited.v2','skipped.v1','plan.v1','timing.v1','view','day'];const present=names.some(n=>Object.hasOwn(entries,p+n));const legacy=trip.id==='europe-2026'&&Object.hasOwn(entries,PREFIX+'visited.v1');if(!present&&!legacy)continue;
   const parse=(name,fallback)=>{const key=p+name;if(!Object.hasOwn(entries,key))return fallback;recognized.add(key);try{return JSON.parse(entries[key])}catch{throw Error('Neskaitomi '+trip.title+' duomenys')}};
   const plan=parse('plan.v1',{items:[],order:{}});if(!object(plan)||!Array.isArray(plan.items)||plan.items.length>1000||!object(plan.order))throw Error('Netinkamas asmeninis planas');
   const base=new Set(trip.days.flatMap(d=>d.stops.map(s=>s.id))),known=new Set(base),days=new Set(trip.days.map(d=>d.id));
   for(const item of plan.items){
    if(!object(item)||typeof item.id!=='string'||!/^custom-[a-zA-Z0-9-]{1,80}$/.test(item.id)||known.has(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>150||typeof item.dayId!=='string'||item.dayId&&!days.has(item.dayId)||!Number.isInteger(item.minutes)||item.minutes<1||item.minutes>1440||typeof item.note!=='string'||item.note.length>2000||typeof item.url!=='string'||item.url.length>2000||item.url&&!/^https:\/\//i.test(item.url))throw Error('Netinkama arba pasikartojanti asmeninė vieta');
    if(item.lat!==null&&(!Number.isFinite(item.lat)||Math.abs(item.lat)>90)||item.lon!==null&&(!Number.isFinite(item.lon)||Math.abs(item.lon)>180)||item.dayId&&(item.lat===null||item.lon===null))throw Error('Netinkamos koordinatės');known.add(item.id);
   }
   for(const [dayId,order] of Object.entries(plan.order)){const day=trip.days.find(d=>d.id===dayId);if(!day||!Array.isArray(order)||new Set(order).size!==order.length)throw Error('Netinkama stotelių seka');const members=new Set([...day.stops.map(x=>x.id),...plan.items.filter(x=>x.dayId===dayId).map(x=>x.id)]);if(order.some(x=>!members.has(x)))throw Error('Stotelė nepriklauso nurodytai dienai');}
   let visited=parse('visited.v2',[]);const skipped=parse('skipped.v1',[]);
   if(legacy&&!Object.hasOwn(entries,p+'visited.v2')){recognized.add(PREFIX+'visited.v1');let old;try{old=JSON.parse(entries[PREFIX+'visited.v1'])}catch{throw Error('Netinkamas senas progresas')};if(!Array.isArray(old)||old.some(x=>!trip.legacyIds[x]))throw Error('Neatpažinti seno progreso ID');visited=old.map(x=>trip.legacyIds[x]);}
   for(const ids of [visited,skipped])if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(x=>!known.has(x)))throw Error('Neatpažinti ar pasikartojantys progreso ID');
   // Stage 2 could preserve an old visited flag under a skipped stop: skipped wins.
   visited=visited.filter(x=>!skipped.includes(x));
   const timing=parse('timing.v1',{days:{},legs:{}});timingValid(timing,trip,known);
   const view=entries[p+'view']||'travel',day=entries[p+'day']||trip.days[0].id;if(!['travel','plan'].includes(view)||!days.has(day))throw Error('Netinkamas pasirinktas rodinys arba diena');
   if(Object.hasOwn(entries,p+'view'))recognized.add(p+'view');if(Object.hasOwn(entries,p+'day'))recognized.add(p+'day');
   result.push({id:trip.id,title:trip.title,places:plan.items.length,visited:visited.length,skipped:skipped.length,changes:{[p+'visited.v2']:JSON.stringify(visited),[p+'skipped.v1']:JSON.stringify(skipped),[p+'plan.v1']:JSON.stringify(plan),[p+'timing.v1']:JSON.stringify(timing),[p+'view']:view,[p+'day']:day,[p+'road.v'+trip.version]:null}});
  }
  if(!result.length)throw Error('Kopijoje nėra palaikomų kelionių duomenų');
  return {trips:result,ignored:Object.keys(entries).filter(k=>!recognized.has(k)).length};
 }
 function restoreValues(storage,values){for(const [key,value] of Object.entries(values)){if(value===null)storage.removeItem(key);else storage.setItem(key,value)}for(const [key,value] of Object.entries(values))if(storage.getItem(key)!==value)throw Error('Atkūrimo patikra nepavyko')}
 function recover(storage){const raw=storage.getItem(JOURNAL);if(!raw)return false;const record=JSON.parse(raw);if(!object(record)||!object(record.before)||Object.entries(record.before).some(([k,v])=>!k.startsWith(PREFIX)||k===JOURNAL||(v!==null&&typeof v!=='string')))throw Error('Neatpažintas atkūrimo žurnalas');restoreValues(storage,record.before);storage.removeItem(JOURNAL);return true;}
 function applyImport(storage,changes){
  recover(storage);const before={};for(const key of Object.keys(changes)){if(!key.startsWith(PREFIX)||key===JOURNAL||key===PREVIOUS)throw Error('Neleistinas atkūrimo raktas');before[key]=storage.getItem(key)}
  const rollback={...before,[PREVIOUS]:storage.getItem(PREVIOUS)};storage.setItem(JOURNAL,JSON.stringify({before:rollback}));
  try{restoreValues(storage,changes);storage.setItem(PREVIOUS,JSON.stringify({values:before}));if(storage.getItem(PREVIOUS)!==JSON.stringify({values:before}))throw Error('Kopija neišsaugota');storage.removeItem(JOURNAL)}
  catch(error){try{restoreValues(storage,rollback);storage.removeItem(JOURNAL)}catch{throw Error('Atkūrimas nutrūko. Ankstesni duomenys išsaugoti atkūrimo žurnale; perkraukite puslapį.')}throw Error('Importas neatliktas; ankstesni duomenys atkurti. '+error.message)}
 }
 function undoImport(storage){const raw=storage.getItem(PREVIOUS);if(!raw)throw Error('Nėra ankstesnės importo kopijos');const v=JSON.parse(raw);if(!object(v.values))throw Error('Netinkama atkūrimo kopija');applyImport(storage,v.values);}
 return {clock,format,legKey,calculate,validateBackup,timingValid,applyImport,recover,undoImport,JOURNAL,PREVIOUS};
});
