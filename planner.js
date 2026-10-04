(() => {
 'use strict';
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
 const clone=v=>JSON.parse(JSON.stringify(v));
 window.TripPlanner={prepare(config){
  const key=`kelione2026.${config.id}.plan.v1`, viewKey=`kelione2026.${config.id}.view`, dayKey=`kelione2026.${config.id}.day`;
  let state={items:[],order:{}},broken=false;
  try{const raw=localStorage.getItem(key);if(raw){state=JSON.parse(raw);if(!Array.isArray(state.items)||!state.order||typeof state.order!=='object'||Array.isArray(state.order))throw Error();
    const ids=new Set();for(const x of state.items){if(!x||typeof x.id!=='string'||!x.id.startsWith('custom-')||ids.has(x.id)||typeof x.name!=='string'||!Number.isFinite(x.minutes)||x.minutes<1||x.minutes>1440||typeof x.dayId!=='string')throw Error();ids.add(x.id);
      if(x.dayId&&(!config.days.some(d=>d.id===x.dayId)||!Number.isFinite(x.lat)||!Number.isFinite(x.lon)||Math.abs(x.lat)>90||Math.abs(x.lon)>180))throw Error();}
    for(const order of Object.values(state.order))if(!Array.isArray(order)||order.some(id=>typeof id!=='string')||new Set(order).size!==order.length)throw Error();}}catch{broken=true;state={items:[],order:{}}}
  const read=k=>{try{return localStorage.getItem(k)}catch{return null}};
  const save=next=>{if(broken){alert('Plano duomenys neįskaitomi. Pirmiausia eksportuokite atsarginę kopiją.');return false}try{localStorage.setItem(key,JSON.stringify(next));state=next;return true}catch{alert('Pakeitimų išsaugoti nepavyko. Ankstesnis planas nepakeistas.');return false}};
  const root=document.getElementById('tripRoot'),days=[...root.querySelectorAll('.day')];
  const status=el('p','', 'planner-status');status.setAttribute('role','status');
  const bar=el('div',undefined,'mode-bar');bar.setAttribute('aria-label','Programos rodinys');
  const travel=el('button','Keliauti'),plan=el('button','Planuoti');travel.type=plan.type='button';
  const daySelect=el('select');daySelect.setAttribute('aria-label','Pasirinkta diena');
  for(const d of config.days){const o=el('option',d.title);o.value=d.id;daySelect.append(o)}
  daySelect.value=read(dayKey)||config.days[0].id;if(!daySelect.value)daySelect.value=config.days[0].id;
  bar.append(travel,plan,daySelect);document.querySelector('.trip-picker').after(bar);
  const panel=el('section',undefined,'planning-panel');const add=el('button','+ Pridėti vietą');add.type='button';
  const wish=el('div');panel.append(add,el('h2','Norimos aplankyti vietos'),wish);bar.after(panel);panel.after(status);
  const notice=el('p','Papildomos vietos pakeičia maršrutą. Ankstesni atvykimo laikai nebeperskaičiuoti; grįžimą patikrinkite navigacijoje.','trip-notice');notice.hidden=true;status.after(notice);
  const refreshNotice=()=>{const changed=state.items.some(x=>x.dayId)||Object.keys(state.order).length>0;notice.hidden=!changed;document.body.dataset.planChanged=String(changed)};
  const returnLink=el('a','Grįžti į dienos pabaigos vietą','return-link');bar.append(returnLink);
  function selectDay(){
   for(const d of days)d.hidden=d.id!==daySelect.value;
   try{localStorage.setItem(dayKey,daySelect.value)}catch{}
   const day=days.find(d=>d.id===daySelect.value),last=[...day.querySelectorAll('a.btn')].at(-1);
   returnLink.href=last?.href||'#';returnLink.hidden=!last;returnLink.target='_blank';returnLink.rel='noopener';
   window.dispatchEvent(new CustomEvent('trip-day-changed',{detail:daySelect.value}));
  }
  // Keep the original day destination, even when a custom stop is appended.
  const destinations=Object.fromEntries(days.map(d=>[d.id,[...d.querySelectorAll('a.btn')].at(-1)?.href]));
  function updateDay(){selectDay();returnLink.href=destinations[daySelect.value]||'#';returnLink.hidden=!destinations[daySelect.value]}
  const mode=value=>{document.body.dataset.mode=value;panel.hidden=value!=='plan';travel.setAttribute('aria-pressed',String(value==='travel'));plan.setAttribute('aria-pressed',String(value==='plan'));try{localStorage.setItem(viewKey,value)}catch{};updateDay()};
  travel.onclick=()=>mode('travel');plan.onclick=()=>mode('plan');daySelect.onchange=updateDay;
  const card=item=>{
   const step=el('div',undefined,'step');step.dataset.stopId=item.id;step.dataset.custom='true';
   const grid=el('div',undefined,'step-grid'),body=el('div');body.append(el('h3',item.name,'title'),el('div',`Lankymui ${item.minutes} min. · atvykimas neperskaičiuotas`,'meta'),el('p',item.note||'Jūsų pridėta vieta.','desc'));
   const target=`${item.lat},${item.lon}`;body.append(el('div',target,'addr'));const nav=el('a','VAŽIUOTI','btn');nav.href='https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',destination:target,travelmode:'driving',dir_action:'navigate'});nav.target='_blank';nav.rel='noopener';body.append(nav);grid.append(body);step.append(grid);return step;
  };
  for(const item of state.items.filter(x=>x.dayId)){
   const day=days.find(d=>d.id===item.dayId);if(!day||!Number.isFinite(item.lat)||!Number.isFinite(item.lon))continue;
   day.append(card(item));
  }
  for(const day of days){const order=state.order[day.id]||[];const steps=[...day.querySelectorAll('.step')];steps.sort((a,b)=>{const ai=order.indexOf(a.dataset.stopId),bi=order.indexOf(b.dataset.stopId);return (ai<0?1e6:ai)-(bi<0?1e6:bi)}).forEach(s=>day.append(s));}
  function controls(){for(const day of days)for(const step of day.querySelectorAll('.step')){
   const actions=el('div',undefined,'planner-actions');
   for(const [label,delta] of [['↑ Aukštyn',-1],['↓ Žemyn',1]]){const b=el('button',label);b.type='button';b.onclick=()=>{
    const nodes=[...day.querySelectorAll('.step')],i=nodes.indexOf(step),j=i+delta;if(j<0||j>=nodes.length)return;
    [nodes[i],nodes[j]]=[nodes[j],nodes[i]];const next=clone(state);next.order[day.id]=nodes.map(x=>x.dataset.stopId);
    if(save(next)){nodes.forEach(x=>day.append(x));refreshNotice();status.textContent='Stotelių seka išsaugota. Atvykimo laikus reikia perskaičiuoti.';window.dispatchEvent(new Event('trip-plan-changed'))}
   };actions.append(b)}
   const item=state.items.find(x=>x.id===step.dataset.stopId);if(item){const b=el('button','Redaguoti');b.type='button';b.onclick=()=>edit(item);actions.append(b)}step.append(actions);
  }}
  function wishlist(){wish.replaceChildren();const items=state.items.filter(x=>!x.dayId);if(!items.length)wish.append(el('p','Čia išsaugokite vietas vėlesniam planavimui.'));for(const item of items){const row=el('div',undefined,'wish-row');row.append(el('strong',item.name));const b=el('button','Redaguoti / įtraukti');b.type='button';b.onclick=()=>edit(item);row.append(b);wish.append(row)}}
  function edit(item){
   if(broken){alert('Išsaugoto plano nuskaityti nepavyko. Eksportuokite atsarginę kopiją prieš keisdami duomenis.');return}
   const dialog=el('dialog',undefined,'place-dialog'),form=el('form');form.method='dialog';form.append(el('h2',item?'Redaguoti vietą':'Pridėti vietą'));
   const input=(label,type,value,required=false)=>{const l=el('label',label),i=el('input');i.type=type;i.value=value??'';i.required=required;l.append(i);form.append(l);return i};
   const name=input('Pavadinimas','text',item?.name,true);name.maxLength=150;
   const url=input('Google Maps nuoroda (neprivaloma)','url',item?.url);url.placeholder='https://maps.app.goo.gl/…';
   const lat=input('Platuma (įtraukiant į dieną)','number',item?.lat),lon=input('Ilguma (įtraukiant į dieną)','number',item?.lon);lat.step=lon.step='any';lat.min='-90';lat.max='90';lon.min='-180';lon.max='180';
   const minutes=input('Lankymo trukmė minutėmis','number',item?.minutes??60,true);minutes.min='1';minutes.max='1440';
   const label=el('label','Kur išsaugoti'),select=el('select');select.setAttribute('aria-label','Kur išsaugoti');const o=el('option','Norimų vietų sąraše');o.value='';select.append(o);for(const d of config.days){const o=el('option',d.title);o.value=d.id;select.append(o)}select.value=item?.dayId||'';label.append(select);form.append(label);
   const afterLabel=el('label','Įterpti po'),after=el('select');after.setAttribute('aria-label','Įterpti po');afterLabel.append(after);form.append(afterLabel);
   const positions=()=>{after.replaceChildren();const o=el('option','Dienos pradžioje');o.value='';after.append(o);const day=days.find(d=>d.id===select.value);for(const s of day?.querySelectorAll('.step')||[]){if(s.dataset.stopId===item?.id)continue;const o=el('option',s.querySelector('.title').textContent);o.value=s.dataset.stopId;after.append(o)}afterLabel.hidden=!select.value;lat.required=lon.required=!!select.value;};select.onchange=positions;positions();
   if(item?.dayId){const ids=[...days.find(d=>d.id===item.dayId).querySelectorAll('.step')].map(x=>x.dataset.stopId);after.value=ids[ids.indexOf(item.id)-1]||''}
   const noteLabel=el('label','Pastaba'),note=el('textarea');note.value=item?.note||'';note.maxLength=2000;noteLabel.append(note);form.append(noteLabel);
   form.append(el('p','Trumpa Maps nuoroda koordinačių automatiškai neužpildo. Pridėjus stotelę, bendras grįžimo laikas dar neperskaičiuojamas.'));
   const err=el('p');err.setAttribute('role','alert');form.append(err);
   const ok=el('button','Išsaugoti');ok.type='submit';const cancel=el('button','Atšaukti');cancel.type='button';cancel.onclick=()=>dialog.close();form.append(ok,cancel);
   form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;const n=name.value.trim();if(!n){err.textContent='Įrašykite pavadinimą.';return}
    const latitude=lat.value===''?null:Number(lat.value),longitude=lon.value===''?null:Number(lon.value);
    if(select.value&&(latitude===null||longitude===null||!Number.isFinite(latitude)||!Number.isFinite(longitude))){err.textContent='Patikslinkite koordinates.';return}
    if(url.value&&!/^https:\/\//i.test(url.value)){err.textContent='Nuoroda turi prasidėti https://';return}
    const entry={id:item?.id||'custom-'+crypto.randomUUID(),name:n,url:url.value,lat:latitude,lon:longitude,minutes:Number(minutes.value),dayId:select.value,note:note.value};const next=clone(state);next.items=next.items.filter(x=>x.id!==entry.id);next.items.push(entry);
    for(const day of days){if(day.id!==entry.dayId&&day.id!==item?.dayId)continue;let ids=[...day.querySelectorAll('.step')].map(x=>x.dataset.stopId).filter(x=>x!==entry.id);if(day.id===entry.dayId)ids.splice(after.value?ids.indexOf(after.value)+1:0,0,entry.id);next.order[day.id]=ids}
    if(save(next)){try{localStorage.removeItem(`kelione2026.${config.id}.road.v${config.version}`)}catch{}dialog.close();location.reload()}
   };
   dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();name.focus();
  }
  add.onclick=()=>edit(null);controls();wishlist();refreshNotice();mode(read(viewKey)==='plan'?'plan':'travel');
  window.addEventListener('trip-plan-changed',()=>{try{localStorage.removeItem(`kelione2026.${config.id}.road.v${config.version}`)}catch{}});
  if(broken){status.textContent='Išsaugoto plano nepavyko nuskaityti. Originalūs duomenys nepakeisti.';add.disabled=true}
  window.TripPlanner.activeDay=()=>daySelect.value;
 }};
})();
