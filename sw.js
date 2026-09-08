const CACHE='kelione-2026-pwa-v5';
const SHELL_KEY='./__kelione_shell_v5.html';
const CORE=['./manifest.webmanifest','./icon.svg','./app-v5.css','./app-v5.js'];
const EXTERNAL=['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
const PLACEHOLDER='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

function transformText(text){
  const styleTag='<link rel="stylesheet" href="./app-v5.css"/>';
  const scriptTag='<script src="./app-v5.js" defer></script>';
  const styleRe=/<style id=["']trip-progress-styles["'][^>]*>[\s\S]*?<\/style>/i;
  const scriptRe=/<script id=["']trip-progress-script["'][^>]*>[\s\S]*?<\/script>/i;
  text=styleRe.test(text)?text.replace(styleRe,styleTag):text.replace('</head>',styleTag+'</head>');
  text=scriptRe.test(text)?text.replace(scriptRe,scriptTag):text.replace('</body>',scriptTag+'</body>');

  const pool=[], seen=new Map();
  text=text.replace(/src="(data:image\/[^;"]+;base64,[^"]+)"/g,(m,data)=>{
    let key=seen.get(data);
    if(key===undefined){key=String(pool.length);seen.set(data,key);pool.push(data);}
    return `src="${PLACEHOLDER}" data-img="${key}"`;
  });
  const poolTag=`<script id="image-pool" type="application/json">${JSON.stringify(pool)}</script>`;
  text=text.replace('</body>',poolTag+'</body>');
  return text;
}

async function fetchAndTransform(){
  const raw=await fetch('./index.html',{cache:'no-store'});
  if(!raw.ok)throw new Error('index '+raw.status);
  const text=transformText(await raw.text());
  return new Response(text,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
}

async function updateShell(cache){
  const transformed=await fetchAndTransform();
  await cache.put(SHELL_KEY,transformed.clone());
  return transformed;
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE);
    await updateShell(cache);
    await Promise.allSettled(EXTERNAL.map(async url=>{
      const r=await fetch(url,{mode:'cors'});
      if(r.ok)await cache.put(url,r.clone());
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window'});
    for(const client of clients){try{await client.navigate(client.url)}catch(e){}}
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const cached=await cache.match(SHELL_KEY);
      if(cached){
        event.waitUntil(updateShell(cache).catch(()=>{}));
        return cached;
      }
      try{return await updateShell(cache)}
      catch(e){return (await cache.match(SHELL_KEY))||Response.error()}
    })());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached)return cached;
    try{
      const fresh=await fetch(req);
      if(fresh&&(fresh.ok||fresh.type==='opaque')){
        const cache=await caches.open(CACHE);
        await cache.put(req,fresh.clone());
      }
      return fresh;
    }catch(e){return cached||Response.error()}
  })());
});
