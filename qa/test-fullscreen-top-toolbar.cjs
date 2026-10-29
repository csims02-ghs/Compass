const fs=require('node:fs'),assert=require('node:assert/strict'),http=require('node:http'),{chromium}=require('playwright');
const source=fs.readFileSync('index.html','utf8');
const extraCss=fs.readFileSync('workspace-fullscreen.css','utf8');
const controlJs=fs.readFileSync('workspace-fullscreen.js','utf8');
const mainAt=source.indexOf('<main class="main">');
const toolbarStart=source.indexOf('<div id="workspaceTopToolbar"',mainAt);
const toolbarEnd=source.indexOf('</div>',toolbarStart)+6;
assert(mainAt>0&&toolbarStart>mainAt&&toolbarEnd>toolbarStart,'Toolbar must be the first child of main');
const toolbar=source.slice(toolbarStart,toolbarEnd);
assert((source.match(/id="workspaceFullscreenToggle"/g)||[]).length===1);
assert((source.match(/id="mobileMenu"/g)||[]).length===1);
assert(!source.slice(source.indexOf('<div id="app"'),mainAt).includes('id="workspaceFullscreenToggle"'),'Toggle must not be a floating app child');
assert(toolbar.includes('id="mobileMenu"')&&toolbar.includes('id="workspaceFullscreenToggle"'));
assert(source.includes('workspace-fullscreen.css?v=2'));
const embeddedCss=(source.match(/<style>([\s\S]*?)<\/style>/)||[])[1]||'';
const doc=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${embeddedCss}\n${extraCss}</style></head><body>
<div id="app" class="app"><aside id="sidebar" class="sidebar"><div class="brand-title">COMPASS</div></aside>
<main class="main">${toolbar}<section class="page active" id="page-sessions">
<div class="content" id="pageContent"><h1>Session & Notes</h1><article class="card panel" id="workPanel">Manual Input <input id="manualText" value="preserve entered data"></article><div style="height:1200px"></div></div>
</section></main></div>
<script>${controlJs.replaceAll('</script','<\\/script')}</script></body></html>`;
const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(doc)});
(async()=>{await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:390,height:844}]){
const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
const read=()=>page.evaluate(()=>{
const main=document.querySelector('.main').getBoundingClientRect(),toolbar=document.querySelector('#workspaceTopToolbar').getBoundingClientRect(),toggle=document.querySelector('#workspaceFullscreenToggle').getBoundingClientRect(),content=document.querySelector('#pageContent').getBoundingClientRect(),menu=document.querySelector('#mobileMenu').getBoundingClientRect();
const css=getComputedStyle(document.querySelector('#workspaceFullscreenToggle'));
return {main:{left:main.left,right:main.right},toolbar:{top:toolbar.top,bottom:toolbar.bottom,right:toolbar.right},toggle:{top:toggle.top,bottom:toggle.bottom,right:toggle.right,left:toggle.left},content:{top:content.top},position:css.position,menu:{left:menu.left,right:menu.right,display:getComputedStyle(document.querySelector('#mobileMenu')).display},sidebar:getComputedStyle(document.getElementById('sidebar')).display};
});
let p=await read();
assert(p.toolbar.top===0,'Toolbar must be the topmost row, not offset or floating');
assert.equal(p.position,'static','Fullscreen toggle should not be fixed');
assert(p.content.top>=p.toolbar.bottom,'Main page content must start below toolbar');
assert(p.toggle.top>=p.toolbar.top&&p.toggle.bottom<=p.toolbar.bottom,'Toggle must stay within reserved toolbar');
assert(Math.abs(p.toggle.right-p.toolbar.right)<30,'Toggle must sit in top far-right corner');
if(viewport.width<=850)assert(p.menu.display!=='none'&&p.menu.right<=p.toggle.left,'Mobile menu may not overlap toggle');
await page.locator('#manualText').fill('keep this value');
await page.locator('#workspaceFullscreenToggle').click();
let expanded=await read();
assert(expanded.main.left===0,'Hide left menu expands main to full width');
assert(expanded.sidebar==='none','Sidebar must be hidden');
assert.equal(await page.locator('#workspaceFullscreenToggle').getAttribute('aria-pressed'),'true');
assert.equal(await page.locator('.workspace-fullscreen-label').textContent(),'Show Menu');
assert(expanded.content.top>=expanded.toolbar.bottom,'Expanded content must stay below toolbar');
assert.equal(await page.locator('#manualText').inputValue(),'keep this value','Toggle must not reset in-progress manual entry');
await page.locator('#workspaceFullscreenToggle').click();
let restored=await read();
assert.equal(await page.locator('#workspaceFullscreenToggle').getAttribute('aria-pressed'),'false');
assert.equal(await page.locator('.workspace-fullscreen-label').textContent(),'Full Screen');
if(viewport.width>850)assert(restored.main.left>0&&restored.sidebar!=='none','Normal desktop left menu restored');
assert(restored.content.top>=restored.toolbar.bottom);
assert.equal(errors.length,0,errors.join(';'));
console.log('PASS toolbar layout',viewport.width+'x'+viewport.height,'top-right no overlap, mobile controls, menu toggle/restore, form preserved');
await page.close();
}}finally{await browser.close();await new Promise(ok=>server.close(ok));}})().catch(e=>{console.error(e);process.exit(1)});
