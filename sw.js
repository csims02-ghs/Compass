/* COMPASS service worker: online navigation is authoritative; caches are offline fallbacks only. */
const CACHE='compass-shell-counting-save-20261031';
// Cache the canonical application and current program adapters; never prefetch archived loaders.
const CORE=[
  "./",
  "./index.html",
  "./program-hub.html",
  "./manifest.webmanifest",
  "./compass-page2-standard.js?v=20261031-counting-save-v1",
  "./compass-page2-standard.css?v=20261027-v3",
  "./compass-session-save-bridge.js?v=20261029-v1",
  "./compass-body-parts-v25.js",
  "./compass-body-parts-v25.css",
  "./compass-counting-setup-save.js?v=20261031-v1",
  "./compass-counting-setup-save.css?v=20261031-v1",
  "./compass-addition-v25.js?v=20261031-v1",
  "./compass-addition-v25.css?v=20261031-v1",
  "./compass-functions-v25.js",
  "./compass-functions-v25.css",
  "./compass-fine-motor-imitation-v25.js?v=20261027-v1",
  "./compass-fine-motor-imitation-v25.css?v=20261027-v1",
  "./compass-colors-v25.js?v=20261027-v5",
  "./compass-colors-v25.css?v=20261027-v5",
  "./compass-clothing-v25.js",
  "./compass-clothing-v25.css",
  "./compass-admin-ui.js?v=20261019",
  "./assigned-program-iep-links.js?v=1",
  "./progress-profile-live-v1.js?v=8",
  "./session-notes-tabs.js?v=1",
  "./session-notes-tabs.css?v=1",
  "./manual-input-workspace.js?v=20261029-session-summary-v1",
  "./manual-input-workspace.css?v=20261029-session-summary-v1",
  "./workspace-fullscreen.js?v=20261029-sidebar-v1",
  "./workspace-fullscreen.css?v=20261029-nav-v2"
];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(const url of CORE){try{await cache.add(new Request(url,{cache:'reload'}))}catch(err){console.warn('COMPASS cache miss',url,err)}}await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('compass-shell-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url),sameOrigin=url.origin===self.location.origin;
 if(!sameOrigin)return;
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
 event.respondWith((async()=>{try{const res=await fetch(req,{cache:'no-store'});if(res.ok){const cache=await caches.open(CACHE);await cache.put(req,res.clone())}return res}catch(err){return(await caches.match(req))||Response.error()}})());
});
