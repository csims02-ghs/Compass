/* COMPASS service worker: online navigation is authoritative; caches are offline fallbacks only. */
const CACHE='compass-shell-v47';
const RELEASE='v20261010-3';
const CORE=['./','./compass-page2-standard.js?v=20261027-v6','./compass-page2-standard.css?v=20261027-v3','./compass-body-parts-v25.js','./compass-body-parts-v25.css','./compass-colors-v25.js?v=20261027-v25-5','./compass-colors-v25.css?v=20261027-v25-5','./index.html','./compass-admin-ui.js','./index-profile-charts-v5-20261017.html','./program-hub.html','./manifest.webmanifest',
'./release/v20261010-3/part01.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part02.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part03.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part04a.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part04b.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part04c.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part05.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part06.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part07.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part08a.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part08b.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part08c.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part09a.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part09b.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part09c.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part10a.txt?release=v20261010-3-program-hub-v4',
'./release/v20261010-3/part10b.txt?release=v20261010-3-program-hub-v4'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(const url of CORE){try{await cache.add(new Request(url,{cache:'reload'}))}catch(err){console.warn('COMPASS cache miss',url,err)}}await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('compass-shell-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url),sameOrigin=url.origin===self.location.origin;
 if(!sameOrigin)return;
 const isRelease=url.pathname.includes('/release/'+RELEASE+'/');
 if(req.mode==='navigate'){
  const name=url.pathname.split('/').pop().toLowerCase();
  if(name==='reset.html'||name==='invite.html'||name==='refresh.html'){
   event.respondWith(fetch(req,{cache:'no-store'}));return;
  }
  const isHome=name===''||name==='index.html';
  const isHub=name==='program-hub.html';
  if(!isHome&&!isHub){event.respondWith(fetch(req,{cache:'no-store'}));return}
  const key=isHub?'./program-hub.html':'./index.html';
  event.respondWith((async()=>{try{
   const res=await fetch(req,{cache:'no-store'});
   if(res.ok){const cache=await caches.open(CACHE);await cache.put(key,res.clone())}
   return res;
  }catch(err){return(await caches.match(key))||Response.error()}})());return;
 }
 if(isRelease){
  event.respondWith((async()=>{const cached=await caches.match(req);if(cached)return cached;const res=await fetch(req,{cache:'no-store'});if(res.ok){const cache=await caches.open(CACHE);await cache.put(req,res.clone())}return res})());return;
 }
 event.respondWith((async()=>{try{const res=await fetch(req,{cache:'no-store'});if(res.ok){const cache=await caches.open(CACHE);await cache.put(req,res.clone())}return res}catch(err){return(await caches.match(req))||Response.error()}})());
});
