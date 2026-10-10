const CACHE='compass-shell-v10';
const RELEASE='v20261010-3';
const FILES=[
  'part01.txt','part02.txt','part03.txt',
  'part04a.txt','part04b.txt','part04c.txt',
  'part05.txt','part06.txt','part07.txt',
  'part08a.txt','part08b.txt','part08c.txt',
  'part09a.txt','part09b.txt','part09c.txt',
  'part10a.txt','part10b.txt'
];
const CORE=[
  './',
  './index.html',
  './reset.html',
  './manifest.webmanifest',
  ...FILES.map(name=>`./release/${RELEASE}/${name}?release=${RELEASE}-calendar`)
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const url of CORE){
      try{await cache.add(new Request(url,{cache:'reload'}));}
      catch(err){console.warn('COMPASS cache miss',url,err);}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(req,{cache:'no-store'});
        if(response&&response.status===200){
          const cache=await caches.open(CACHE);
          cache.put('./index.html',response.clone());
        }
        return response;
      }catch(err){
        return (await caches.match('./index.html'))||Response.error();
      }
    })());
    return;
  }

  const url=new URL(req.url);
  const sameOrigin=url.origin===self.location.origin;
  const isRelease=url.pathname.includes(`/release/${RELEASE}/`);
  if(sameOrigin&&isRelease){
    event.respondWith((async()=>{
      const cached=await caches.match(req);
      if(cached) return cached;
      const response=await fetch(req,{cache:'no-store'});
      if(response&&response.status===200){
        const cache=await caches.open(CACHE);
        cache.put(req,response.clone());
      }
      return response;
    })());
    return;
  }

  event.respondWith((async()=>{
    try{
      const response=await fetch(req,{cache:'no-store'});
      if(response&&response.status===200&&sameOrigin){
        const cache=await caches.open(CACHE);
        cache.put(req,response.clone());
      }
      return response;
    }catch(err){
      return (await caches.match(req))||Response.error();
    }
  })());
});
