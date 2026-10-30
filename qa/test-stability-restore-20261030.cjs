#!/usr/bin/env node
// COMPASS Stability Restore 2026-10-30: guard navigation against stale content.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const js=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  .filter(m=>!(/\bsrc\s*=/.test(m[1])||/text\/plain/.test(m[1])));
assert(js.length>=5,'Expected production COMPASS scripts');
js.forEach((m,i)=>new vm.Script(m[2],{filename:'main-inline-'+(i+1)}));
assert(html.includes('id="compass-profile-transition-guard"'),'Student profile transition CSS missing');
assert(html.includes("page.classList.add('compass-profile-loading')"),'Previous student page must be hidden before navigating');
assert(html.includes("await loadStudentProfile();"),'Profile must finish loading before it is revealed');
assert(html.includes("page.classList.remove('compass-profile-loading')"),'Profile must unmask after load');
assert(html.includes("page.setAttribute('aria-busy','true')"),'Student profile busy state not announced');
assert(!html.includes('swReloadArmed')&&!html.includes('swReloaded'),'Service worker must not force unexpected reload');
assert(html.includes("await navigator.serviceWorker.register('./sw.js')"),'Offline service worker must remain active');
assert(html.includes("frame.contentDocument?.URL==='about:srcdoc'"),'Program list frame must wait for the new document');
assert(html.includes("run.index!==renderingIndex"),'Stale runner callbacks must not reveal the wrong program');
assert(html.includes("frame.onload=null;frame.style.visibility=''"),'Runner needs to reset on close');
assert(html.includes("run.index++;$('runnerFrame').style.visibility='hidden'"),'Old program must hide on Next Program');
console.log('COMPASS_STABILITY_RESTORE_MAIN_PASS',js.length,'inline scripts');
