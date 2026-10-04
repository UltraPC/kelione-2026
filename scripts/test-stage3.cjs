const assert=require('node:assert/strict'),C=require('../trip-core.js');
const trips=['europe-2026','alanya-2026'].map(id=>require('../data/'+id+'.json')),d=trips[1].days[0];
const base={start:d.start,startMinutes:630,departureMinutes:630,returnMinutes:1140,bufferMinutes:60,end:d.end,stops:d.stops.filter(s=>!s.terminal),legs:d.legs};
assert.equal(C.calculate(base).finish,1080);assert.equal(C.calculate(base).status,'on-time');
assert.equal(C.calculate({...base,startMinutes:690}).status,'low-buffer');assert.equal(C.calculate({...base,startMinutes:691}).status,'late');
assert.equal(C.calculate({...base,stops:base.stops.slice(1)}).finish,null);
assert.equal(C.calculate({...base,stops:[...base.stops].reverse()}).finish,null);
assert.equal(C.calculate({...base,legs:{}}).missing.length,3);
assert.equal(C.calculate({...base,stops:[]}).finish,630);
assert.equal(C.calculate({...base,breakMinutes:30,stayMinutes:10}).finish,1120);
assert.equal(C.calculate({...base,stops:[{...base.stops[0],visitMinutes:null}]}).finish,null);
assert.equal(C.calculate({...base,startMinutes:1200,stops:[]}).status,'late');
assert.equal(C.calculate({...base,departureMinutes:1380,startMinutes:1380,returnMinutes:60,stops:[]}).deadline,1500);
const p='kelione2026.alanya-2026.',payload={format:'kelione2026-backup',version:1,entries:{[p+'visited.v2']:JSON.stringify([d.stops[0].id]),'unrelated':'untouched'}};
const v=C.validateBackup(payload,trips);assert.equal(v.ignored,1);assert.equal(v.trips.length,1);assert.equal(v.trips[0].visited,1);
assert.throws(()=>C.validateBackup({...payload,entries:{[p+'visited.v2']:'["bad"]'}},trips));
assert.throws(()=>C.validateBackup({...payload,entries:{[p+'plan.v1']:'{"items":[],"order":{"a1":["bad"]}}'}},trips));
assert.throws(()=>C.validateBackup({...payload,version:3},trips));
class Storage{constructor(seed={}){this.map=new Map(Object.entries(seed));this.calls=0;this.fail=0}getItem(k){return this.map.get(k)??null}setItem(k,v){this.calls++;if(this.calls===this.fail)throw Error('quota');this.map.set(k,String(v))}removeItem(k){this.calls++;if(this.calls===this.fail)throw Error('quota');this.map.delete(k)}}
const seed={[p+'visited.v2']:'[]','other':'preserved','kelione2026.europe-2026.day':'d3'};
let store=new Storage(seed);C.applyImport(store,v.trips[0].changes);assert.equal(store.getItem(p+'visited.v2'),payload.entries[p+'visited.v2']);assert.equal(store.getItem('kelione2026.europe-2026.day'),'d3');C.undoImport(store);assert.equal(store.getItem(p+'visited.v2'),'[]');
for(let failure=1;failure<=10;failure++){store=new Storage(seed);store.fail=failure;try{C.applyImport(store,v.trips[0].changes)}catch{assert.equal(store.getItem(p+'visited.v2'),'[]');assert.equal(store.getItem('other'),'preserved');assert.equal(store.getItem(C.JOURNAL),null)}}
store=new Storage(seed);C.applyImport(store,v.trips[0].changes);C.applyImport(store,v.trips[0].changes);assert.equal(JSON.parse(store.getItem(p+'visited.v2')).length,1);
store=new Storage({...seed,[p+'visited.v2']:'["partial"]',[C.JOURNAL]:JSON.stringify({before:{[p+'visited.v2']:'[]'}})});assert.equal(C.recover(store),true);assert.equal(store.getItem(p+'visited.v2'),'[]');assert.equal(store.getItem(C.JOURNAL),null);
console.log('PASS stage3 core: schedule, margins, overnight, missing legs/visits, end destination, backup validation, isolated replacement, undo, repeat import, quota rollback and interrupted recovery.');
