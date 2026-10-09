const CACHE='compass-shell-v8';
const CORE=['./','./index.html','./reset.html','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    for(const u of CORE){try{await c.add(u)}catch(e){console.warn('cache miss',u,e)}}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;

  const isCompassApp=req.url.includes('COMPASS_WITH_OFFLINE_PROGRAM_LISTS.html');
  if(req.mode==='navigate' || isCompassApp){
    event.respondWith((async()=>{
      try{
        const r=await fetch(req,{cache:'no-store'});
        if(r && r.status===200){const c=await caches.open(CACHE);c.put(req,r.clone())}
        return r;
      }catch{
        return (await caches.match(req)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached)return cached;
    try{
      const r=await fetch(req);
      if(r&&r.status===200){const c=await caches.open(CACHE);c.put(req,r.clone())}
      return r;
    }catch{return cached}
  })());
});
