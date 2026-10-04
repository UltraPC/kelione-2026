const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require(process.env.JSDOM_PATH||'jsdom');const root=path.resolve(__dirname,'..');
async function boot(seed={}){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://ultrapc.github.io/kelione-2026/?trip=alanya-2026',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});const w=dom.window;
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLElement.prototype.scrollTo=function(){};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 for(const [k,v] of Object.entries(seed))w.localStorage.setItem(k,v);
 const later=w.setTimeout.bind(w);w.setTimeout=(f,ms)=>ms>=900?0:later(f,ms);
 w.fetch=async url=>url.startsWith('./data/')?{ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url),'utf8'))}:{ok:false};
 for(const f of ['planner.js','trip-bootstrap.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 await new Promise(r=>setTimeout(r,10));w.eval(fs.readFileSync(path.join(root,'app-v6.js'),'utf8'));await new Promise(r=>setTimeout(r,20));return dom;
}
(async()=>{
 let d=await boot(),w=d.window,doc=w.document;
 assert.equal(doc.body.dataset.mode,'travel');assert.equal(doc.querySelectorAll('.day:not([hidden])').length,1);
 doc.querySelector('.skip-btn').click();assert.equal(doc.querySelectorAll('.skipped').length,1);assert.match(doc.querySelector('#activeDaySummary').textContent,/1 praleista/);
 doc.querySelector('.visit-btn').click();assert.equal(doc.querySelectorAll('.skipped').length,0);assert.equal(doc.querySelectorAll('.visited').length,1);
 doc.querySelector('.mode-bar button:nth-child(2)').click();assert.equal(doc.body.dataset.mode,'plan');
 doc.querySelector('.planning-panel > button').click();let form=doc.querySelector('dialog form');
 form.querySelector('input[type=text]').value='<img src=x onerror=alert(1)>';
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 const key='kelione2026.alanya-2026.plan.v1',state=JSON.parse(w.localStorage.getItem(key));assert.equal(state.items.length,1);assert.equal(state.items[0].dayId,'');assert.equal(Object.keys(state.order).length,0);
 d.window.close();d=await boot({[key]:JSON.stringify(state)});w=d.window;doc=w.document;assert.equal(doc.querySelector('.wish-row strong').textContent,state.items[0].name);assert.equal(doc.querySelector('.wish-row img'),null);
 doc.querySelector('.wish-row button').click();form=doc.querySelector('dialog form');const ns=form.querySelectorAll('input[type=number]');ns[0].value='36.55';ns[1].value='32.1';const select=form.querySelector('select');select.value='a1';select.dispatchEvent(new w.Event('change'));form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 const added=w.localStorage.getItem(key);assert.equal(JSON.parse(added).items[0].dayId,'a1');d.window.close();
 d=await boot({[key]:added});w=d.window;doc=w.document;assert.equal(doc.querySelectorAll('.step').length,6);assert.equal(doc.querySelector('.step').dataset.custom,'true');assert.equal(doc.body.dataset.planChanged,'true');
 const id=doc.querySelector('.step').dataset.stopId;doc.querySelector('.visit-btn').click();doc.querySelector('.planner-actions button:nth-child(2)').click();assert.equal(doc.querySelector('[data-stop-id="'+id+'"]').classList.contains('visited'),true);
 const ds=doc.querySelector('.mode-bar select');ds.value='a2';ds.dispatchEvent(new w.Event('change'));assert.equal(doc.querySelector('.day:not([hidden])').id,'a2');assert.match(doc.querySelector('#activeDaySummary').textContent,/2 diena/);
 const persisted=w.localStorage.getItem(key),visited=w.localStorage.getItem('kelione2026.alanya-2026.visited.v2');d.window.close();
 d=await boot({[key]:persisted,'kelione2026.alanya-2026.visited.v2':visited});assert.equal(d.window.document.querySelector('[data-stop-id="'+id+'"]').classList.contains('visited'),true);d.window.close();
 d=await boot();w=d.window;doc=w.document;const originalSet=w.Storage.prototype.setItem;
 w.Storage.prototype.setItem=function(k,v){if(k==='kelione2026.alanya-2026.skipped.v1')throw new Error('quota');return originalSet.call(this,k,v)};
 doc.querySelector('.visit-btn').click();assert.equal(doc.querySelectorAll('.visited').length,0,'failed save must roll back UI');assert.equal(w.localStorage.getItem('kelione2026.alanya-2026.visited.v2'),null,'failed second write must restore first');d.window.close();
 d=await boot({[key]:'{broken'});w=d.window;w.alert=()=>{};doc=w.document;doc.querySelector('.planner-actions button:nth-child(2)').click();assert.equal(w.localStorage.getItem(key),'{broken','invalid saved plan must not be overwritten');d.window.close();
 console.log('PASS: modes, day filter, skip/visited exclusivity, wishlist, safe text rendering, insert with coordinates, reorder, persistence stable progress, failed-write rollback and malformed-data preservation.');
})().catch(e=>{console.error(e);process.exitCode=1});
