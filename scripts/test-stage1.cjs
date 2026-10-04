const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.resolve(__dirname,'..');
async function boot(id,seed={},mutate){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:`https://ultrapc.github.io/kelione-2026/?trip=${id}`,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLElement.prototype.scrollTo=function(){};
 for(const [k,v] of Object.entries(seed))w.localStorage.setItem(k,v);
 w.fetch=async url=>{if(!url.startsWith('./data/'))return {ok:false};const j=JSON.parse(fs.readFileSync(path.join(root,url),'utf8'));if(mutate)mutate(j);return {ok:true,json:async()=>j}};
 const later=w.setTimeout.bind(w);w.setTimeout=(f,ms)=>ms>=900?0:later(f,ms);
 w.eval(fs.readFileSync(path.join(root,'trip-bootstrap.js'),'utf8'));await new Promise(r=>setTimeout(r,10));
 assert(w.TRIP_CONFIG,'bootstrap should succeed');
 w.eval(fs.readFileSync(path.join(root,'app-v6.js'),'utf8'));await new Promise(r=>setTimeout(r,20));return dom;
}
(async()=>{
 let d=await boot('europe-2026',{'kelione2026.visited.v1':'["d1-s1","d2-s1"]'});let w=d.window;
 assert.equal(w.document.querySelectorAll('.step').length,65);
 assert.equal(w.document.querySelectorAll('.step.visited').length,2);
 assert.equal(w.localStorage.getItem('kelione2026.visited.v1'),'["d1-s1","d2-s1"]');
 assert.equal(w.localStorage.getItem('kelione2026.visited.v1.backup'),'["d1-s1","d2-s1"]');
 const saved=w.localStorage.getItem('kelione2026.europe-2026.visited.v2');d.window.close();
 d=await boot('europe-2026',{'kelione2026.visited.v1':'["d1-s1"]','kelione2026.europe-2026.visited.v2':saved},trip=>{trip.days.reverse()});
 assert.equal(d.window.document.querySelectorAll('.step.visited').length,2,'reordering must preserve progress');d.window.close();
 d=await boot('alanya-2026',{'kelione2026.visited.v1':'["d1-s1"]','kelione2026.europe-2026.visited.v2':saved});w=d.window;
 assert.equal(w.document.querySelectorAll('.step.visited').length,0);
 w.document.querySelector('.visit-btn').click();assert.equal(w.document.querySelectorAll('.step.visited').length,1);
 assert.equal(w.localStorage.getItem('kelione2026.europe-2026.visited.v2'),saved);
 assert.equal(w.TRIP_CONFIG.start.includes('Hanau'),false);d.window.close();
 const europe=JSON.parse(fs.readFileSync(path.join(root,'data/europe-2026.json')));
 const invariant=JSON.parse(fs.readFileSync(path.join(root,'data/legacy-invariants.json')));
 const doc=new JSDOM(europe.days.map(d=>d.html).join('')).window.document;
 const stops=[...doc.querySelectorAll('.step')];assert.equal(stops.length,invariant.length);
 stops.forEach((s,i)=>{assert.equal(s.querySelector('.title').textContent,invariant[i].title);assert.deepEqual([...s.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),invariant[i].links)});
 console.log('PASS: migration, legacy backup, repeat load, day reorder, isolated trip progress, click/save, 65 unchanged navigation links.');
})().catch(e=>{console.error(e);process.exitCode=1});
