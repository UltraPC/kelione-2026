(async () => {
  'use strict';
  const root=document.getElementById('tripRoot');
  const allowed=['europe-2026','alanya-2026'];
  const read=k=>{try{return localStorage.getItem(k)}catch{return null}};
  const url=new URL(location.href);
  const requested=url.searchParams.get('trip')||read('kelione2026.activeTrip')||'europe-2026';
  const id=allowed.includes(requested)?requested:'europe-2026';
  const key=`kelione2026.${id}.visited.v2`;
  try {
    const response=await fetch(`./data/${id}.json`);
    if(!response.ok)throw new Error('Nepavyko įkelti kelionės duomenų');
    const trip=await response.json();
    if(trip.id!==id||!Array.isArray(trip.days)||!trip.days.length)throw new Error('Netinkami kelionės duomenys');
    const known=new Set();
    for(const day of trip.days){
      const template=document.createElement('template');template.innerHTML=day.html;
      for(const stop of template.content.querySelectorAll('.step')){
        const sid=stop.dataset.stopId;if(!sid||known.has(sid))throw new Error('Pasikartojantis stotelės ID');known.add(sid);
      }
    }
    let migrated=[];let storageWarning=false;
    try{
      if(id==='europe-2026'&&localStorage.getItem(key)===null){
        const raw=localStorage.getItem('kelione2026.visited.v1');
        if(raw!==null){
          const old=JSON.parse(raw);if(!Array.isArray(old))throw new Error('Netinkamas senas progresas');
          if(old.some(x=>!trip.legacyIds[x]))throw new Error('Neatpažinti seno progreso ID');
          migrated=old.map(x=>trip.legacyIds[x]);
          if(localStorage.getItem('kelione2026.visited.v1.backup')===null)localStorage.setItem('kelione2026.visited.v1.backup',raw);
          localStorage.setItem(key,JSON.stringify(migrated));
          if(localStorage.getItem(key)!==JSON.stringify(migrated))throw new Error('Progreso perkėlimas nepatvirtintas');
        }
      }
      localStorage.setItem('kelione2026.activeTrip',id);
    }catch{storageWarning=true;}
    window.TRIP_CONFIG={...trip,storageKey:key,migrated};
    root.replaceChildren();
    const index=document.createElement('nav');index.className='index';index.setAttribute('aria-label','Kelionės dienos');
    for(const d of trip.days){const a=document.createElement('a');a.href='#'+d.id;a.textContent=d.title;index.append(a)}
    root.append(index);
    if(trip.draft){const note=document.createElement('p');note.className='trip-notice';note.textContent='Alanijos planas: laikai orientaciniai. Kainos, darbo laikas, orai ir tikslūs parkavimo taškai dar nepatvirtinti.';root.append(note)}
    for(const d of trip.days)root.insertAdjacentHTML('beforeend',d.html);
    if(storageWarning){const p=document.createElement('p');p.className='trip-notice';p.setAttribute('role','alert');p.textContent='Nepavyko patikimai išsaugoti arba perkelti progreso. Sena kopija nepanaikinta. Eksportuokite atsarginę kopiją.';root.prepend(p)}
    const selector=document.getElementById('tripSelect');selector.value=id;
    selector.onchange=()=>{const next=new URL(location.href);next.searchParams.set('trip',selector.value);next.hash='';location.assign(next)};
    document.getElementById('exportBackup').onclick=()=>{
      try{const entries={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('kelione2026.'))entries[k]=localStorage.getItem(k)}
        const blob=new Blob([JSON.stringify({format:'kelione2026-backup',version:1,createdAt:new Date().toISOString(),entries},null,2)],{type:'application/json'});
        const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='keliones-atsargine-kopija.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
      }catch{alert('Atsarginės kopijos paruošti nepavyko. Duomenys nepakeisti.')}
    };
    const script=document.createElement('script');script.src='./app-v6.js';script.onerror=()=>{root.prepend(Object.assign(document.createElement('p'),{textContent:'Nepavyko įkelti programos. Pabandykite atnaujinti puslapį.'}))};document.body.append(script);
  }catch(error){root.textContent=error.message+'. Patikrinkite ryšį ir atnaujinkite puslapį.'}
})();
