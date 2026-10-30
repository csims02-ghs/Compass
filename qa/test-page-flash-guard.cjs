#!/usr/bin/env node
// Regression guard for COMPASS stale page flashes. No login or student data required.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const hub=fs.readFileSync('program-hub.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const runner=hub.slice(hub.indexOf('async function loadRunner(sp,seq){'),hub.indexOf('async function openAt(i)'));
assert(runner.length>1000,'Program Hub loadRunner was not found');
const onload=runner.indexOf('frame.onload=()=>{');
const hide=runner.indexOf('frame.hidden=true;\n  frame.removeAttribute(\'srcdoc\');frame.src=url;');
assert(onload>=0&&hide>onload,'New iframe should be hidden until its load event');
assert(runner.includes("frame.onload=()=>{\n   if(seq!==S.loadSeq)return;\n   $('loading').hidden=true;\n   frame.hidden=false;"),'Only the current loaded program may become visible');
assert(!runner.includes("frame.removeAttribute('srcdoc');frame.src=url;\n  frame.hidden=false;"),'Never expose iframe immediately after setting src');
assert(hub.includes('.runner[hidden]{visibility:hidden}'),'Hidden frames must remain invisible');
assert(/const CACHE='compass-shell-v\d+'/.test(sw),'Service worker cache release must be versioned');
const release=sw.slice(sw.indexOf(' if(isRelease){'),sw.lastIndexOf(' event.respondWith'));
assert(release.includes("fetch(req,{cache:'no-store'})"),'Release assets must prefer network');
assert(!release.includes('if(cached)return cached'),'Release assets must not use cache-first');
assert(sw.includes('return(await caches.match(req))||Response.error()'),'Offline release fallback must remain available');
new vm.Script(sw,{filename:'sw.js'});
const inline=[...hub.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
for(let i=0;i<inline.length;i++)new vm.Script(inline[i][2],{filename:'hub-inline-'+i+'.js'});
console.log('COMPASS_PAGE_FLASH_GUARD_PASS',inline.length,'inline scripts');
