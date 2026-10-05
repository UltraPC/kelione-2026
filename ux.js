(() => {
 'use strict';
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
 let config,initialized=false,toolsBody,nextTitle,nextLink,status,offline,updateButton,registration,saveTimer;
 const originals=new Map();
 const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}};
 function notify(text,undo=false){status.replaceChildren(el('span',text));if(undo){const b=el('button','Atšaukti žymėjimą');b.type='button';b.onclick=()=>{if(window.TripProgress?.undo())notify('Ankstesnis žymėjimas grąžintas.')};status.append(b)}clearTimeout(saveTimer);saveTimer=setTimeout(()=>status.replaceChildren(),10000)}
 function practical(step,stop){
  if(step.querySelector('.place-facts'))return;
  const details=el('details',undefined,'place-facts'),summary=el('summary','Lankymo informacija');details.append(summary);const list=el('dl');
  const data=stop?.practical||{};
  const fields=[['Parkingas',data.parking||'Tikslus parkingas nepatvirtintas. Navigacijos tikslas nebūtinai yra parkingas.'],['Ėjimas nuo automobilio',Number.isFinite(data.walkMinutes)?`${data.walkMinutes} min.`:'Nepatikrinta'],['Lankymo trukmė',Number.isFinite(stop?.visitMinutes)?`${stop.visitMinutes} min. pagal planą`:'Nurodyta asmeninės vietos plane'],['Kaina',data.price||'Nepatikrinta'],['Darbo laikas',data.hours||'Nepatikrinta'],['Google įvertinimas',Number.isFinite(data.rating)&&Number.isInteger(data.reviewCount)?`${data.rating}/5 · ${data.reviewCount} atsiliepimų`:'Nepatikrinta'],['Duomenų patikra',data.checkedAt||'Patikros data nenurodyta']];
  for(const [name,value] of fields){list.append(el('dt',name),el('dd',value))}details.append(list);
  if(data.source&&safeURL(data.source)){const a=el('a','Informacijos šaltinis');a.href=safeURL(data.source);a.target='_blank';a.rel='noopener';details.append(a)}
  const nav=step.querySelector('a[data-nav]')||step.querySelector('a.btn');if(nav){try{const destination=new URL(nav.href).searchParams.get('destination');if(destination){const a=el('a','Tikrinti vietą Google Maps');a.href='https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:destination});a.target='_blank';a.rel='noopener';details.append(a)}}catch{}}
  const old=originals.get(step.dataset.stopId);if(old){const original=el('p','Pirminis planas: '+old.originalMeta);original.className='original-time';details.append(original)}step.append(details);
 }
 function refresh(){if(!initialized)return;const snapshot=window.TripTiming?.snapshot;if(!snapshot)return;
  const {day,result,stops,anchor,invalid}=snapshot,arrivals=new Map(result.arrivals.map(x=>[x.id,x.minutes])),models=new Map(stops.map(x=>[x.id,x]));
  const section=document.getElementById(day.id),nodes=[...section.querySelectorAll('.step')];
  // Static departure and arrival labels must never compete with the recalculated schedule.
  const sub=section.querySelector('.sub');if(sub&&!sub.dataset.original){sub.dataset.original=sub.textContent;const old=el('details',undefined,'original-day');old.append(el('summary','Pirminis dienos aprašas'),el('p',sub.textContent));sub.replaceChildren(old)}
  for(const step of nodes){const id=step.dataset.stopId,stop=originals.get(id),meta=step.querySelector('.meta');practical(step,stop);
   if(meta){const arrival=stop?.terminal?result.finish:arrivals.get(id);meta.textContent=invalid?'Atvykimas neapskaičiuotas':step.classList.contains('skipped')?'Praleista':anchor?.id===id?`Išvykimo atskaita ${window.TripCore.format(anchor.minutes)}`:anchor&&!models.has(id)&&!stop?.terminal?'Neįtraukta į likusią dieną':arrival!==null&&arrival!==undefined?`Planinis atvykimas ${window.TripCore.format(arrival)}`:'Atvykimas neapskaičiuotas';}
   const visit=models.get(id)?.visitMinutes??stop?.visitMinutes;const facts=step.querySelector('.place-facts dl');if(facts){const dd=[...facts.querySelectorAll('dt')].find(x=>x.textContent==='Lankymo trukmė')?.nextElementSibling;if(dd&&Number.isFinite(visit))dd.textContent=`${visit} min. pagal planą`}
   if(!stop?.terminal&&!step.querySelector('.depart-btn')){const b=el('button','Išvykstu iš čia','depart-btn');b.type='button';b.onclick=()=>{window.TripTiming.depart(id);notify('Išvykimo atskaita nustatyta šiam atidarymui. Perkrovus puslapį vėl rodomas dienos planas.');window.scrollTo({top:0,behavior:'smooth'})};(step.querySelector('.step-actions')||step).append(b)}
  }
  const next=nodes.find(n=>!n.classList.contains('visited')&&!n.classList.contains('skipped')&&window.TripTiming.isRemaining(n.dataset.stopId));
  nextTitle.textContent=invalid&&anchor?'Patikslinkite likusios dienos pradžią':next?next.querySelector('.title').textContent:'Dienos vietos pažymėtos';
  const nextButton=document.getElementById('nextUnvisited');if(nextButton)nextButton.disabled=!!(invalid&&anchor);
  const nav=next?.querySelector('a[data-nav]')||next?.querySelector('a.btn');nextLink.hidden=!nav||!!(invalid&&anchor);if(nav){nextLink.href=nav.href;nextLink.textContent=nav.classList.contains('walk')?'Eiti į kitą vietą':'Važiuoti į kitą vietą'}
 }
 async function checkOffline(){if(!offline)return;offline.textContent='Tikrinama kelionės kopija…';if(!('serviceWorker' in navigator)){offline.textContent='Ši naršyklė nepalaiko kelionės kopijos be interneto.';return}
  try{registration=await navigator.serviceWorker.getRegistration();const worker=navigator.serviceWorker.controller||registration?.active;if(!worker){offline.textContent='Kopija dar ruošiama. Palikite puslapį atidarytą su internetu.';return}
   const result=await new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('timeout'))},5000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data)};worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2])});
   offline.textContent=result?.ready?'Kelionių planai paruošti be interneto. Žemėlapiui, nuotraukoms ir navigacijai gali reikėti ryšio.':'Kelionės kopija nepilna. Prisijunkite ir patikrinkite atnaujinimą.';
  }catch{offline.textContent='Kopijos paruošimo patvirtinti nepavyko. Patikrinkite atnaujinimą.'}
  if(registration?.waiting)showUpdate();
 }
 function showUpdate(){updateButton.hidden=false;updateButton.textContent='Įjungti naują versiją';}
 window.TripUX={checkOffline,prepare(trip){config=trip;for(const d of config.days)for(const s of d.stops)originals.set(s.id,s);
  const header=document.querySelector('.trip-picker'),tools=el('details',undefined,'trip-tools');tools.id='tripTools';tools.append(el('summary','Nustatymai ir kopijos'));toolsBody=el('div');toolsBody.id='tripToolsBody';toolsBody.append(document.getElementById('exportBackup'));tools.append(toolsBody);header.after(tools);
  const hero=el('section',undefined,'next-place');hero.setAttribute('aria-label','Kita vieta');nextTitle=el('h2');nextLink=el('a','Važiuoti į kitą vietą','next-link');nextLink.target='_blank';nextLink.rel='noopener';hero.append(el('small','KITA VIETA'),nextTitle,nextLink);document.querySelector('.mode-bar').after(hero);
  status=el('div',undefined,'save-status');status.setAttribute('role','status');hero.after(status);
  offline=el('p',undefined,'offline-state');offline.textContent='Kelionės kopija tikrinama…';toolsBody.append(offline);
  const check=el('button','Patikrinti kopiją ir atnaujinimą');check.type='button';check.onclick=async()=>{check.disabled=true;try{registration=await navigator.serviceWorker?.getRegistration();await registration?.update();await checkOffline()}catch{offline.textContent='Atnaujinimo patikrinti nepavyko. Patikrinkite interneto ryšį.'}finally{check.disabled=false}};toolsBody.append(check);
  updateButton=el('button','Įjungti naują versiją');updateButton.type='button';updateButton.hidden=true;toolsBody.append(updateButton);header.append(updateButton);
  updateButton.onclick=()=>{if(document.querySelector('dialog[open]')){notify('Prieš atnaujindami išsaugokite arba uždarykite atidarytą formą.');return}if(registration?.waiting){navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});updateButton.disabled=true}};
  window.addEventListener('trip-timing-updated',refresh);window.addEventListener('trip-saved',e=>notify('Pakeitimai išsaugoti šiame įrenginyje.',e.detail?.undo));window.addEventListener('trip-worker-ready',checkOffline);window.addEventListener('online',checkOffline);window.addEventListener('offline',checkOffline);
 },ready(){initialized=true;
  const panel=document.querySelector('.timing-panel'),settings=[...panel.querySelectorAll('button')].find(b=>b.textContent==='Laiko nustatymai');if(settings)toolsBody.prepend(settings);toolsBody.append(panel.querySelector('.timing-source'),panel.querySelector('details'));
  const hero=document.querySelector('.next-place');hero.after(panel);refresh();
  try{const msg=sessionStorage.getItem('trip-save-message');if(msg){notify(msg);sessionStorage.removeItem('trip-save-message')}}catch{}
  checkOffline();
  if('serviceWorker' in navigator)navigator.serviceWorker.ready.then(r=>{registration=r;const watch=()=>{const w=r.installing;if(w)w.addEventListener('statechange',()=>{if(w.state==='installed'&&r.waiting)showUpdate()})};r.addEventListener('updatefound',watch);watch();if(r.waiting)showUpdate()}).catch(()=>{});
 }};
})();
