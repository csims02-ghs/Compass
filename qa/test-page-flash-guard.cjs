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
assert(!sw.includes('v20261010-3')&&!sw.includes('index-profile-charts-v5-20261017'),'Archived releases must not be in the live pre-cache');
assert(!sw.includes('if(cached)return cached'),'Service worker must not use cache-first for active files');
assert(sw.includes("fetch(req,{cache:'no-store'})"),'Active files must prefer the network');
assert(sw.includes('return(await caches.match(req))||Response.error()'),'Offline cache fallback must remain available');
new vm.Script(sw,{filename:'sw.js'});
const inline=[...hub.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
for(let i=0;i<inline.length;i++)new vm.Script(inline[i][2],{filename:'hub-inline-'+i+'.js'});
console.log('COMPASS_PAGE_FLASH_GUARD_PASS',inline.length,'inline scripts');
