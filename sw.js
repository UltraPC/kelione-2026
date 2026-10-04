const CACHE='kelione-2026-pwa-v6-stage2';
const CORE=['./','./index.html','./manifest.webmanifest','./icon.svg','./app-v5.css','./trips.css','./app-v6.js','./trip-bootstrap.js','./planner.js','./data/europe-2026.json','./data/alanya-2026.json'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(CORE)})())});
// A new worker waits for existing pages to close, so editing is not interrupted.
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('kelione-2026-pwa-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 const scope=new URL(self.registration.scope);
 if(!url.pathname.startsWith(scope.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  // Keep the installed shell, scripts and data on one version. Queries select a trip in the bootstrap.
  if(req.mode==='navigate')return (await cache.match('./index.html'))||fetch(req);
  const cached=await cache.match(req);if(cached)return cached;
  return fetch(req);
 })());
});

self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting()});
