
(() => {
  'use strict';
  const config=window.TRIP_CONFIG;
  const STORAGE_KEY=config.storageKey;
  const GEO_KEY='kelione2026.geo.v2';
  const DIST_KEY=`kelione2026.${config.id}.road.v${config.version}`;
  const GEO_DELAY=1150;
  const SKIP_KEY=`kelione2026.${config.id}.skipped.v1`;
  let skipped=new Set();try{skipped=new Set(JSON.parse(localStorage.getItem(SKIP_KEY)||'[]'))}catch{}
  const pending=s=>!visited.has(s.dataset.visitId)&&!skipped.has(s.dataset.visitId);
  let visited=new Set(), lastTouched=-1, activeDay=null, scrollTick=false;
  let deferredInstallPrompt=null, tripMap=null, mapLayerGroup=null, gpsMarker=null;
  let mapFilter='all', geocoding=false, geocodeDone=0, geocodeTotal=0;
  const safeParse=(v,f)=>{try{return JSON.parse(v)}catch(e){return f}};
  const loadVisited=()=>{try{visited=new Set(safeParse(localStorage.getItem(STORAGE_KEY),config.migrated||[])||config.migrated||[])}catch(e){visited=new Set(config.migrated||[])}};
  function commitStatus(nextVisited,nextSkipped){
    let oldVisited,oldSkipped;
    try{
      oldVisited=localStorage.getItem(STORAGE_KEY);oldSkipped=localStorage.getItem(SKIP_KEY);
      localStorage.setItem(STORAGE_KEY,JSON.stringify([...nextVisited]));
      localStorage.setItem(SKIP_KEY,JSON.stringify([...nextSkipped]));
    }catch{
      try{if(oldVisited===null)localStorage.removeItem(STORAGE_KEY);else if(oldVisited!==undefined)localStorage.setItem(STORAGE_KEY,oldVisited);
        if(oldSkipped===null)localStorage.removeItem(SKIP_KEY);else if(oldSkipped!==undefined)localStorage.setItem(SKIP_KEY,oldSkipped)}catch{}
      toast('Nepavyko išsaugoti progreso. Pakeitimas neatliktas.',5000);return false;
    }
    visited=nextVisited;skipped=nextSkipped;return true;
  }
  const getGeo=()=>{try{return safeParse(localStorage.getItem(GEO_KEY),{})||{}}catch(e){return {}}};
  const saveGeo=g=>{try{localStorage.setItem(GEO_KEY,JSON.stringify(g))}catch(e){}};
  const getRoad=()=>{try{return safeParse(localStorage.getItem(DIST_KEY),null)}catch(e){return null}};
  const saveRoad=v=>{try{localStorage.setItem(DIST_KEY,JSON.stringify(v))}catch(e){}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const toast=(msg,ms=2300)=>{let t=document.getElementById('offlineToast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(t._hide);t._hide=setTimeout(()=>t.classList.remove('show'),ms)};
  function hydrateImages(){try{const p=JSON.parse(document.getElementById('image-pool')?.textContent||'{}');document.querySelectorAll('img[data-img]').forEach(img=>{img.loading='lazy';img.decoding='async';const v=p[img.dataset.img];if(v)img.src=v})}catch(e){}}


  function practicalNote(step,mode){
    const title=(step.querySelector('.title')?.textContent||'').toLowerCase();
    const meta=step.querySelector('.meta')?.textContent||'';
    const addr=step.querySelector('.addr')?.textContent||'';
    const times=[...meta.matchAll(/(\d{1,2}):(\d{2})/g)].map(m=>(+m[1])*60+(+m[2]));
    let dur='';
    if(times.length>=2&&!/kitą dieną/i.test(meta)&&times[1]>=times[0])dur=` Plane numatyta apie ${times[1]-times[0]} min.`;
    if(/parking|automobilio parkingas/.test(title)){
      let s='Automobilį palikite nurodytame taške ir toliau laikykitės suplanuoto pėsčiųjų etapo.';
      if(/boccadasse|lucca|pisa|portofino|sestri|tellaro/.test(title)||/genova/i.test(addr))s+=' Italijos centruose stebėkite ZTL (riboto eismo zonos) ženklus ir nevažiuokite pro elektroninius vartus be leidimo.';
      return dur+s;
    }
    if(/grįžti/.test(title))return dur+' Tai kontrolinis grįžimo taškas; jį pažymėjus programa tiksliai persijungs į kitą etapą.';
    if(/nakvyn|lodge|hotel urirotstock|via adda/.test(title))return 'Tai dienos finišo / nakvynės taškas. Atvykę pažymėkite stotelę; kitą rytą programa automatiškai rodys pirmą neaplankytą vietą.';
    if(/pass|chasseral|panorama|rhône glacier|grimsel|nufenen/.test(title))return dur+' Aukštikalnėse oras ir kelių būklė gali keistis greitai; prieš išvykstant patikrinkite oficialią kelių informaciją, turėkite šiltesnį sluoksnį ir sustokite tik saugiose aikštelėse.';
    if(mode==='walking')return dur+' Etapas suplanuotas pėsčiomis. Naudokite „EITI“, o pasiekę vietą pažymėkite ją kaip aplankytą.';
    return dur+' „VAŽIUOTI“ atidaro tikslią šios stotelės Google Maps navigaciją. Atvykę pažymėkite stotelę – progreso žemėlapyje ši dalis taps žalia.';
  }

  function prepareStepUI(step){
    const nav=step.querySelector('a.btn[href*="google.com/maps/dir/"]');
    let mode='driving';
    if(nav){
      nav.dataset.nav='1';
      try{mode=new URL(nav.href).searchParams.get('travelmode')||'driving'}catch(e){}
      nav.textContent=mode==='walking'?'EITI':'VAŽIUOTI';
      nav.classList.toggle('walk',mode==='walking');
      if(!step.querySelector('.step-actions')){
        const actions=document.createElement('div');actions.className='step-actions';
        nav.parentNode.insertBefore(actions,nav);actions.appendChild(nav);
      }
    }
    const desc=step.querySelector('.desc');
    if(desc&&!step.querySelector('.stop-details')){
      const details=document.createElement('details');details.className='stop-details';
      const summary=document.createElement('summary');summary.textContent='APIE VIETĄ';
      const body=document.createElement('div');body.className='stop-details-body';
      const p=document.createElement('p');p.textContent=desc.textContent.trim();
      const pr=document.createElement('div');pr.className='practical';
      pr.innerHTML='<strong>Praktiška. </strong>'+escapeHtml(practicalNote(step,mode));
      body.append(p,pr);details.append(summary,body);
      const grid=step.querySelector('.step-grid');if(grid)grid.insertAdjacentElement('afterend',details);else step.insertBefore(details,step.firstChild);
      desc.remove();
    }
  }

  function init(){
    hydrateImages();loadVisited();
    const days=[...document.querySelectorAll('.day')], allSteps=[];
    days.forEach((day,di)=>{
      [...day.querySelectorAll('.step')].forEach((step,si)=>{
        const id=step.dataset.stopId; step.dataset.visitId=id; step.dataset.dayIndex=String(di); allSteps.push(step);
        prepareStepUI(step);
        const nav=step.querySelector('a[data-nav="1"]');
        if(nav){try{const u=new URL(nav.href);step.dataset.destination=u.searchParams.get('destination')||step.querySelector('.addr')?.textContent?.trim()||'';step.dataset.mode=u.searchParams.get('travelmode')||'driving'}catch(e){}}
        const b=document.createElement('button'); b.type='button'; b.className='visit-btn';
        b.addEventListener('click',()=>toggleStep(step,allSteps.indexOf(step),allSteps,days));
        const actions=step.querySelector('.step-actions')||(()=>{const d=document.createElement('div');d.className='step-actions';step.appendChild(d);return d})();
        actions.appendChild(b);
        const skip=document.createElement('button');skip.type='button';skip.className='skip-btn';
        skip.onclick=()=>{const id=step.dataset.visitId,nextSkipped=new Set(skipped),nextVisited=new Set(visited);
          if(nextSkipped.has(id))nextSkipped.delete(id);else{nextSkipped.add(id);nextVisited.delete(id)}
          if(!commitStatus(nextVisited,nextSkipped))return;
          update(allSteps,days);if(tripMap)renderMap(allSteps,days);
        };actions.append(skip);
      });
    });

    const index=document.querySelector('.index');
    const active=document.createElement('div'); active.className='active-day-bar'; active.id='activeDayBar';
    active.innerHTML=`<div class="active-day-main">
      <div class="active-day-summary" id="activeDaySummary">Kelionė</div>
      <div class="menu-wrap"><button class="menu-btn" id="menuBtn" type="button" aria-label="Daugiau">⋮</button>
        <div class="quick-menu" id="quickMenu">
          <button id="installPwa" type="button" style="display:none">Įdiegti telefone</button>
          <button id="refreshOffline" type="button">Atnaujinti offline kopiją</button>
          <button id="offlineInfo" type="button" class="muted">Offline būsena</button>
          <button id="resetProgress" type="button">Atstatyti kelionės progresą</button>
        </div>
      </div></div><div class="active-day-track"><div class="active-day-fill" id="activeDayFill"></div></div>`;
    if(index) index.insertAdjacentElement('afterend',active); else document.body.insertBefore(active,document.body.firstChild);

    const toastEl=document.createElement('div'); toastEl.className='offline-toast'; toastEl.id='offlineToast'; document.body.appendChild(toastEl);
    const dock=document.createElement('div'); dock.className='fab-dock';
    const next=document.createElement('button'); next.type='button'; next.className='next-fab'; next.id='nextUnvisited'; next.textContent='KITA VIETA';
    const map=document.createElement('button'); map.type='button'; map.className='map-fab'; map.id='tripMapBtn'; map.textContent='ŽEMĖLAPIS'; map.title='Visos kelionės progreso žemėlapis'; map.setAttribute('aria-label','Visos kelionės progreso žemėlapis');
    dock.append(next,map); document.body.appendChild(dock);
    next.addEventListener('click',()=>goNext(allSteps));
    map.addEventListener('click',()=>openTripMap(days,allSteps));

    buildMapDialog();
    setupMenu(days,allSteps);
    setupInstall();
    setupScrollSpy(days,index,active);
    window.addEventListener('trip-day-changed',e=>{const d=days.find(x=>x.id===e.detail);if(d)setActiveDay(d,days,index)});
    window.addEventListener('trip-plan-changed',()=>{allSteps.splice(0,allSteps.length,...document.querySelectorAll('.step'));update(allSteps,days);if(tripMap)renderMap(allSteps,days,true)});
    const selected=days.find(d=>d.id===window.TripPlanner?.activeDay());if(selected)setActiveDay(selected,days,index);
    update(allSteps,days);
    registerSW();
    setTimeout(()=>backgroundGeocode(allSteps),1800);

    requestAnimationFrame(()=>setTimeout(()=>{
      const firstUnvisited=allSteps.find(s=>!s.closest('.day').hidden&&pending(s));
      const target=firstUnvisited||activeDay?.querySelector('.step');
      if(target&&document.body.dataset.mode!=='plan'){target.scrollIntoView({behavior:'auto',block:'center'});flash(target);const d=target.closest('.day');if(d)setActiveDay(d,days,index)}
    },180));
  }

  function setupMenu(days,allSteps){
    const btn=document.getElementById('menuBtn'), menu=document.getElementById('quickMenu');
    btn.onclick=e=>{e.stopPropagation();menu.classList.toggle('open')};
    document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==btn)menu.classList.remove('open')});
    document.getElementById('offlineInfo').onclick=()=>toast(navigator.onLine?'Online · planą be ryšio naudokite po sėkmingo atnaujinimo':'Be interneto · žemėlapis ir navigacija gali neveikti',3200);
    document.getElementById('refreshOffline').onclick=async()=>{menu.classList.remove('open');try{const r=await navigator.serviceWorker?.getRegistration();await r?.update();toast('Offline kopija patikrinta / atnaujinama')}catch(e){toast('Atnaujinti nepavyko')}};
    document.getElementById('resetProgress').onclick=()=>{if(confirm(`Atstatyti tik kelionės „${config.title}“ ${allSteps.length} stotelių progresą?`)){
      if(!commitStatus(new Set(),new Set()))return;lastTouched=-1;update(allSteps,days);toast('Progresas atstatytas');
    }};
  }

  function setupInstall(){
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;const b=document.getElementById('installPwa');if(b)b.style.display='block'});
    window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;const b=document.getElementById('installPwa');if(b)b.style.display='none';toast('Programa įdiegta')});
    const b=document.getElementById('installPwa');if(b)b.onclick=async()=>{if(!deferredInstallPrompt){toast('Diegimas čia neprivalomas – puslapis jau veikia kaip PWA ir saugo offline kopiją');return}deferredInstallPrompt.prompt();try{await deferredInstallPrompt.userChoice}catch(e){}deferredInstallPrompt=null;b.style.display='none'};
  }

  async function requestPersistentStorage(){
    if(!navigator.storage?.persist)return;
    try{const already=await navigator.storage.persisted?.();if(!already)await navigator.storage.persist()}catch(e){}
  }

  function toggleStep(step,idx,allSteps,days){
    const id=step.dataset.visitId,nextVisited=new Set(visited),nextSkipped=new Set(skipped);
    if(nextSkipped.has(id)){nextSkipped.delete(id);nextVisited.add(id)}else if(nextVisited.has(id))nextVisited.delete(id);else nextVisited.add(id);
    if(!commitStatus(nextVisited,nextSkipped))return;
    lastTouched=idx;requestPersistentStorage();update(allSteps,days);if(tripMap)renderMap(allSteps,days);
  }

  function goNext(allSteps){
    const steps=activeDay?[...activeDay.querySelectorAll('.step')]:allSteps;
    const target=steps.find(pending);
    if(!target){toast('Šioje dienoje nebeliko neaplankytų vietų. Pasirinkite kitą dieną.');return}
    target.scrollIntoView({behavior:'smooth',block:'center'});flash(target);
  }
  function flash(s){s.classList.add('focus-step');setTimeout(()=>s.classList.remove('focus-step'),1400)}

  function setupScrollSpy(days,index,activeBar){
    const syncHeight=()=>{if(index){document.documentElement.style.setProperty('--index-h',index.offsetHeight+'px');document.documentElement.style.setProperty('--active-h',activeBar.offsetHeight+'px')}};
    syncHeight();window.addEventListener('resize',syncHeight,{passive:true});
    const detect=()=>{scrollTick=false;const marker=(index?.offsetHeight||0)+(activeBar?.offsetHeight||0)+8;let current=days.find(d=>!d.hidden)||null,best=Infinity;
      days.filter(d=>!d.hidden).forEach(day=>{const r=day.getBoundingClientRect();if(r.top<=marker&&r.bottom>marker){current=day;best=-1}else if(best>=0){const d=Math.abs(r.top-marker);if(d<best){best=d;current=day}}});
      if(current)setActiveDay(current,days,index)};
    window.addEventListener('scroll',()=>{if(!scrollTick){scrollTick=true;requestAnimationFrame(detect)}},{passive:true});detect();
  }
  function setActiveDay(day,days,index){
    if(!day)return;const changed=activeDay!==day;activeDay=day;
    days.forEach(d=>{const t=document.querySelector(`.index a[href="#${d.id}"]`);if(t)t.classList.toggle('active',d===day)});
    updateActiveDayBar(day);
    if(changed&&index){const tab=document.querySelector(`.index a[href="#${day.id}"]`);if(tab){const left=tab.offsetLeft-index.clientWidth/2+tab.offsetWidth/2;index.scrollTo({left:Math.max(0,left),behavior:'smooth'})}}
  }
  function updateActiveDayBar(day){
    if(!day)return;const ds=[...day.querySelectorAll('.step')];
    const done=ds.filter(s=>visited.has(s.dataset.visitId)&&!skipped.has(s.dataset.visitId)).length;
    const skip=ds.filter(s=>skipped.has(s.dataset.visitId)).length;
    const summary=document.getElementById('activeDaySummary');if(summary)summary.textContent=`${day.querySelector('h2').textContent}\n${done} aplankyta · ${skip} praleista · ${ds.length-done-skip} liko`;
    const fill=document.getElementById('activeDayFill');if(fill)fill.style.width=ds.length?`${(done+skip)*100/ds.length}%`:'0%';
  }
  function update(allSteps,days){
    allSteps.forEach(step=>{const isSkipped=skipped.has(step.dataset.visitId);step.classList.toggle('skipped',isSkipped);const skip=step.querySelector('.skip-btn');if(skip){skip.textContent=isSkipped?'GRĄŽINTI Į PLANĄ':'PRALEISTI';skip.setAttribute('aria-pressed',String(isSkipped))}const yes=visited.has(step.dataset.visitId)&&!isSkipped;step.classList.toggle('visited',yes);const b=step.querySelector('.visit-btn');if(b){b.textContent=yes?'✓ APLANKYTA':'○ APLANKYTA';b.setAttribute('aria-pressed',yes?'true':'false')}});
    const done=allSteps.filter(s=>visited.has(s.dataset.visitId)&&!skipped.has(s.dataset.visitId)).length,total=allSteps.length;
    const fab=document.getElementById('nextUnvisited');if(fab)fab.textContent='KITA VIETA';
    days.forEach(day=>{const ds=[...day.querySelectorAll('.step')],dd=ds.filter(s=>visited.has(s.dataset.visitId)&&!skipped.has(s.dataset.visitId)).length;const tab=document.querySelector(`.index a[href="#${day.id}"]`);
      if(tab){const base=tab.dataset.baseLabel||tab.textContent.replace(/^✓\s*/,'').replace(/\s·\s\d+\/\d+$/,'');tab.dataset.baseLabel=base;tab.textContent=`${dd===ds.length&&ds.length?'✓ ':''}${base} · ${dd}/${ds.length}`;tab.classList.toggle('complete',dd===ds.length&&ds.length>0);tab.classList.toggle('partial',dd>0&&dd<ds.length)}});
    if(activeDay)updateActiveDayBar(activeDay);
  }

  function buildMapDialog(){
    const d=document.createElement('dialog');d.className='map-dialog';d.id='mapDialog';
    d.innerHTML=`<div class="map-shell"><div class="map-head"><strong>Kelionės progreso žemėlapis</strong><button class="map-close" id="mapClose" aria-label="Uždaryti">×</button></div>
      <div class="map-tabs"><button data-filter="all" class="active">VISA KELIONĖ</button><button data-filter="day">ŠI DIENA</button><button data-filter="remaining">LIKO</button></div>
      <div id="tripMap"><div class="map-loading" id="mapLoading">Ruošiamas žemėlapis…</div></div>
      <div class="map-stats" id="mapStats"></div></div>`;
    document.body.appendChild(d);document.getElementById('mapClose').onclick=()=>d.close();
    d.querySelectorAll('.map-tabs button').forEach(b=>b.onclick=()=>{mapFilter=b.dataset.filter;d.querySelectorAll('.map-tabs button').forEach(x=>x.classList.toggle('active',x===b));renderMap([...document.querySelectorAll('.step')],[...document.querySelectorAll('.day')],true)});
  }

  async function ensureLeaflet(){
    if(!document.querySelector('link[data-leaflet-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.crossOrigin='';l.dataset.leafletCss='1';document.head.appendChild(l)}
    if(window.L)return true;
    if(!document.querySelector('script[data-leaflet]')){const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.crossOrigin='';s.dataset.leaflet='1';document.head.appendChild(s)}
    for(let i=0;i<60;i++){if(window.L)return true;await sleep(100)}
    return false;
  }

  async function openTripMap(days,allSteps){
    const d=document.getElementById('mapDialog');if(!d)return;d.showModal();
    const ok=await ensureLeaflet();if(!ok){document.getElementById('mapLoading').textContent='Žemėlapio modulio nepavyko įkelti. Patikrinkite interneto ryšį.';return}
    if(!tripMap){tripMap=L.map('tripMap',{zoomControl:true,preferCanvas:true});L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(tripMap);mapLayerGroup=L.layerGroup().addTo(tripMap)}
    setTimeout(()=>tripMap.invalidateSize(),80);
    requestGPS();renderMap(allSteps,days,true);backgroundGeocode(allSteps);
  }

  function markerIcon(cls,label){
    return L.divIcon({className:'',html:`<div class="route-marker ${cls}">${label}</div>`,iconSize:[28,28],iconAnchor:[14,14]});
  }
  function routeSteps(allSteps,days){
    if(mapFilter==='day'){const day=activeDay||days[0];return [...day.querySelectorAll('.step')]}
    if(mapFilter==='remaining'){const rem=allSteps.filter(pending);const last=[...allSteps].reverse().find(s=>visited.has(s.dataset.visitId));return last?[last,...rem]:rem}
    return allSteps;
  }
  function renderMap(allSteps,days,fit=false){
    if(!tripMap||!mapLayerGroup)return;mapLayerGroup.clearLayers();
    const geo=getGeo(), steps=routeSteps(allSteps,days), latlngs=[], firstTodo=allSteps.find(pending);
    let prev=null, number=0;
    const startGeo=geo[config.start];
    const includeStart=(mapFilter==='all')||(mapFilter==='day'&&(activeDay?.id===config.days[0].id))||(mapFilter==='remaining'&&!allSteps.some(s=>visited.has(s.dataset.visitId)));
    if(includeStart&&startGeo){
      const startLL=[startGeo.lat,startGeo.lon];latlngs.push(startLL);prev=startLL;
      L.marker(startLL,{icon:markerIcon('done','S')}).bindPopup(`<b>${escapeHtml(config.start)} – kelionės pradžia</b>`).addTo(mapLayerGroup);
    }
    steps.forEach(step=>{
      const c=geo[step.dataset.destination];if(!c)return;const ll=[c.lat,c.lon];latlngs.push(ll);number++;
      const done=visited.has(step.dataset.visitId)&&!skipped.has(step.dataset.visitId), isNext=firstTodo===step, mode=step.dataset.mode||'driving';
      const cls=(isNext?'next':done?'done':'todo')+(mode==='walking'?' walk':'');
      const title=step.querySelector('.title')?.textContent?.trim()||'Stotelė';
      const m=L.marker(ll,{icon:markerIcon(cls,number)}).bindPopup(`<b>${escapeHtml(title)}</b><br>${skipped.has(step.dataset.visitId)?'Praleista':done?'✓ Aplankyta':'Liko aplankyti'} · ${mode==='walking'?'pėsčiomis':'automobiliu'}`);m.addTo(mapLayerGroup);
      if(prev){const color=done?'#16a34a':'#1769aa';const dash=mode==='walking'?'6 7':null;L.polyline([prev,ll],{color,weight:4,opacity:.85,dashArray:dash}).addTo(mapLayerGroup)}
      prev=ll;
    });
    if(fit&&latlngs.length){try{tripMap.fitBounds(latlngs,{padding:[25,25],maxZoom:12})}catch(e){}}
    updateMapStats(steps);
    const loading=document.getElementById('mapLoading');
    if(loading){loading.textContent=geocodeTotal&&geocodeDone<geocodeTotal?`Ruošiami žemėlapio taškai ${geocodeDone}/${geocodeTotal}…`:(latlngs.length?`Rodoma ${latlngs.length} stotelių`:'Ruošiami stotelių taškai…');loading.style.display=(geocodeTotal&&geocodeDone<geocodeTotal)||!latlngs.length?'block':'none'}
  }
  const escapeHtml=s=>(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function clockToMin(v){const m=(v||'').match(/(\d{1,2}):(\d{2})/);return m?(+m[1])*60+(+m[2]):null}
  function getDeparture(meta){const ms=[...(meta||'').matchAll(/(\d{1,2}:\d{2})/g)];if(ms.length<2||/kitą dieną/i.test(meta))return null;return clockToMin(ms[1][1])}
  function plannedDrivingMinutes(allSteps){
    let total=0,done=0;const days=[...document.querySelectorAll('.day')];
    days.forEach(day=>{const steps=[...day.querySelectorAll('.step')];let prev=clockToMin(day.querySelector('.sub')?.textContent||'');
      steps.forEach(step=>{const meta=step.querySelector('.meta')?.textContent||'';const arr=clockToMin(meta);if(step.dataset.mode==='driving'&&prev!=null&&arr!=null){let d=arr-prev;if(d<0)d+=1440;if(d>=0&&d<600&&allSteps.includes(step)){total+=d;if(visited.has(step.dataset.visitId))done+=d}}const dep=getDeparture(meta);if(dep!=null)prev=dep;});
    });return {total,done,left:Math.max(0,total-done)}
  }
  function fmtMin(m){const h=Math.floor(m/60),mm=m%60;return h?`${h} val. ${mm?mm+' min.':''}`:`${mm} min.`}
  function updateMapStats(allSteps){
    const done=allSteps.filter(s=>visited.has(s.dataset.visitId)&&!skipped.has(s.dataset.visitId)).length;
    const drive=allSteps.filter(s=>s.dataset.mode==='driving'),driveDone=drive.filter(s=>visited.has(s.dataset.visitId)&&!skipped.has(s.dataset.visitId)).length;
    const changed=skipped.size>0||!!document.querySelector('.step[data-custom]')||document.body.dataset.planChanged==='true';
    const t=plannedDrivingMinutes(allSteps), road=changed?null:getRoad(), el=document.getElementById('mapStats');if(!el)return;
    let kmDone=0,kmLeft=null;
    if(road?.perStep){drive.forEach(s=>{if(visited.has(s.dataset.visitId))kmDone+=road.perStep[s.dataset.visitId]||0});kmLeft=drive.filter(s=>!visited.has(s.dataset.visitId)).reduce((sum,s)=>sum+(road.perStep[s.dataset.visitId]||0),0)}
    const kmDoneText=changed?'Neperskaičiuota':road?`${Math.round(kmDone)} km`:'skaičiuojama…',kmLeftText=changed?'Neperskaičiuota':road?`${Math.round(kmLeft)} km`:'skaičiuojama…';
    el.innerHTML=`<div>Aplankyta<br><b>${done}/${allSteps.length}</b></div><div>Automobilio etapai<br><b>${driveDone}/${drive.length}</b></div>
      <div>Nuvažiuota pagal planą<br><b>${kmDoneText}</b></div><div>Liko važiuoti<br><b>${kmLeftText}</b></div>
      <div>Planinio vairavimo įveikta<br><b>${changed?'Neperskaičiuota':fmtMin(t.done)}</b></div><div>Planinio vairavimo liko<br><b>${changed?'Neperskaičiuota':fmtMin(t.left)}</b></div>
      <div class="map-legend">Žalia – aplankyta, mėlyna – liko, oranžinė – kita vieta, violetinis kontūras / punktyras – pėsčiomis. Kilometrai yra orientaciniai, skaičiuojami vieną kartą pagal OpenStreetMap/OSRM ir išsaugomi telefone. Linijos jungia suplanuotas stoteles ir nėra tiksli kelio geometrija; konkrečiai navigacijai naudokite „VAŽIUOTI / EITI“.</div>`;
  }

  async function requestGPS(){
    if(!navigator.geolocation||!tripMap)return;
    navigator.geolocation.getCurrentPosition(p=>{const ll=[p.coords.latitude,p.coords.longitude];if(gpsMarker)gpsMarker.setLatLng(ll);else gpsMarker=L.marker(ll,{icon:L.divIcon({className:'',html:'<div class="gps-marker"></div>',iconSize:[18,18],iconAnchor:[9,9]})}).bindPopup('Dabartinė jūsų vieta').addTo(tripMap)},()=>{}, {enableHighAccuracy:true,timeout:7000,maximumAge:60000});
  }

  async function backgroundGeocode(allSteps){
    if(geocoding)return;const unique=[...new Set([config.start,...allSteps.map(s=>s.dataset.destination).filter(Boolean)])],geo=getGeo();
    for(const address of unique){const pair=address.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);if(pair&&Math.abs(+pair[1])<=90&&Math.abs(+pair[2])<=180)geo[address]={lat:+pair[1],lon:+pair[2]}}
    saveGeo(geo);const missing=unique.filter(a=>!geo[a]);
    geocodeTotal=unique.length;geocodeDone=unique.length-missing.length;if(!missing.length){await ensureRoadDistances(allSteps);if(tripMap)renderMap(allSteps,[...document.querySelectorAll('.day')]);return}
    geocoding=true;
    for(const address of missing){
      try{
        const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=en&q='+encodeURIComponent(address);
        const r=await fetch(url,{headers:{'Accept':'application/json'}});if(r.ok){const j=await r.json();if(j&&j[0]){geo[address]={lat:+j[0].lat,lon:+j[0].lon};saveGeo(geo)}}
      }catch(e){}
      geocodeDone++;if(tripMap)renderMap(allSteps,[...document.querySelectorAll('.day')]);await sleep(GEO_DELAY);
    }
    geocoding=false;await ensureRoadDistances(allSteps);if(tripMap)renderMap(allSteps,[...document.querySelectorAll('.day')],true);
  }

  async function ensureRoadDistances(allSteps){
    if(document.body.dataset.planChanged==='true')return;
    if(getRoad())return;
    const geo=getGeo(), driving=allSteps.filter(s=>s.dataset.mode==='driving');
    const start=geo[config.start]; if(!start||driving.some(s=>!geo[s.dataset.destination]))return;
    const coords=[[start.lon,start.lat],...driving.map(s=>{const c=geo[s.dataset.destination];return [c.lon,c.lat]})];
    try{
      const url='https://router.project-osrm.org/route/v1/driving/'+coords.map(c=>c.join(',')).join(';')+'?overview=false&steps=false';
      const r=await fetch(url);if(!r.ok)return;const j=await r.json();const legs=j?.routes?.[0]?.legs;
      if(!legs||legs.length!==driving.length)return;
      const perStep={};let totalKm=0;legs.forEach((leg,i)=>{const km=leg.distance/1000;perStep[driving[i].dataset.visitId]=km;totalKm+=km});
      saveRoad({totalKm,perStep,createdAt:new Date().toISOString(),source:'OSRM/OpenStreetMap'});
    }catch(e){}
  }

  async function registerSW(){
    if(!('serviceWorker' in navigator)){toast('Naršyklė nepalaiko offline režimo');return}
    try{await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;setTimeout(()=>toast('Programos offline modulis įjungtas; žemėlapis priklauso nuo ryšio'),900)}
    catch(e){toast('Offline kopijos paruošti nepavyko',3200)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
