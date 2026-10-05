(() => {
 'use strict';const C=window.TripCore;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 window.TripBackup={setup(){
  const header=document.querySelector('#tripToolsBody')||document.querySelector('.trip-picker'),input=el('input');input.type='file';input.accept='.json,application/json';input.hidden=true;
  const button=el('button','Importuoti kopiją'),undo=el('button','Atšaukti paskutinį importą');button.type=undo.type='button';header.append(button,undo,input);undo.hidden=!localStorage.getItem(C.PREVIOUS);
  document.getElementById('exportBackup').onclick=()=>{try{const entries={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^kelione2026\.(europe-2026|alanya-2026)\.(visited\.v2|skipped\.v1|plan\.v1|timing\.v1|view|day)$/.test(k)||k==='kelione2026.visited.v1')entries[k]=localStorage.getItem(k)}const href=URL.createObjectURL(new Blob([JSON.stringify({format:'kelione2026-backup',version:2,createdAt:new Date().toISOString(),entries},null,2)],{type:'application/json'})),a=el('a');a.href=href;a.download='keliones-atsargine-kopija.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000)}catch{alert('Kopijos paruošti nepavyko.')}};
  button.onclick=()=>input.click();
  input.onchange=async()=>{const file=input.files[0];input.value='';if(!file)return;button.disabled=true;try{
   if(file.size>5*1024*1024)throw Error('Kopija per didelė (iki 5 MB).');
   const trips=await Promise.all(['europe-2026','alanya-2026'].map(async id=>{const r=await fetch(`./data/${id}.json`);if(!r.ok)throw Error('Neįkelti kelionių duomenys.');return r.json()}));
   const preview=C.validateBackup(JSON.parse(await file.text()),trips),d=el('dialog');d.className='place-dialog';const form=el('form');form.append(el('h2','Importo peržiūra'),el('p','Pasirinktų kelionių asmeninės vietos, seka, progresas ir laikai bus pakeisti kopijos duomenimis. Trūkstami kopijos laukai bus atkurti į numatytąją būseną. Ankstesnę būseną galėsite grąžinti.'));
   const choices=preview.trips.map(t=>{const label=el('label'),box=el('input');box.type='checkbox';box.checked=true;label.append(box,document.createTextNode(`${t.title}: ${t.places} asmeninių vietų, ${t.visited} aplankyta, ${t.skipped} praleista.`));form.append(label);return {box,t}});
   if(preview.ignored)form.append(el('p',`${preview.ignored} nepalaikomų laukų nebus importuota.`));const error=el('p');error.setAttribute('role','alert');const ok=el('button','Pakeisti pasirinktų kelionių duomenis'),cancel=el('button','Atšaukti');ok.type='submit';cancel.type='button';cancel.onclick=()=>d.close();form.append(error,ok,cancel);d.append(form);document.body.append(d);d.onclose=()=>d.remove();form.onsubmit=e=>{e.preventDefault();const selected=choices.filter(x=>x.box.checked);if(!selected.length){error.textContent='Pasirinkite bent vieną kelionę.';return}try{C.applyImport(localStorage,Object.assign({},...selected.map(x=>x.t.changes)));location.reload()}catch(e){error.textContent=e.message}};d.showModal();
  }catch(e){alert('Importas neatliktas. '+e.message)}finally{button.disabled=false}};
  undo.onclick=()=>{if(!confirm('Grąžinti prieš paskutinį importą buvusius duomenis? Dabartinė tų kelionių būsena bus pakeista.'))return;try{C.undoImport(localStorage);location.reload()}catch(e){alert(e.message)}};
 }};
})();
