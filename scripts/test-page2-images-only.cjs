'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'compass-page2-standard.css'),'utf8');
const helper=fs.readFileSync(path.join(root,'compass-page2-standard.js'),'utf8');
const sandbox={window:{},fetch:async()=>({ok:true,text:async()=>css})};
async function main(){
 vm.runInNewContext(helper,sandbox);
 const standard=sandbox.window.COMPASS_PAGE2_STANDARD;
 const img=col=>'<img alt="" src="data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="'+col+'"/></svg>')+'" style="height:clamp(110px,20vh,240px);width:100%;object-fit:contain">';
 const pictures=['#bbddff','#c8e9d0','#ffe4c8'].map(c=>'<button class="stim-card" type="button">'+img(c)+'</button>').join('');
 const rows=['Noncompliance','Elopement','Self-injury','Tantrums','Screaming'].map(n=>'<div class="behavior-row"><label><span>'+n+'</span></label><div class="freq"><button>−</button><output>0</output><button>+</button></div></div>').join('');
 const base='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
 '*{box-sizing:border-box}html,body{margin:0;height:100%;font:15px Arial}.app{height:100dvh;display:flex;flex-direction:column;overflow:hidden}'+
 '.topbar{height:56px;flex:0 0 56px}.page{display:flex;flex:1;min-height:0}.run-grid{display:grid;flex:1;min-height:0;grid-template-columns:70% 30%;gap:8px;padding:8px}'+
 '.run-card{display:flex;flex-direction:column;overflow:hidden;min-height:0;min-width:0;border:1px solid #ddd;padding:12px}.material-main{flex:1;min-height:0;display:flex;flex-direction:column}'+
 '.material-top,.score-head{display:flex;justify-content:space-between;align-items:center}.choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.stim-card{min-height:130px}'+
 '.score-card{gap:7px}.score-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.stat{padding:8px;border:1px solid #ddd}.score-buttons{display:grid;gap:5px}.score-buttons button{min-height:45px}'+
 '.behavior-list{display:flex;flex-direction:column;gap:6px;overflow:auto}.behavior-row{display:flex;justify-content:space-between;align-items:center}.freq{display:flex;gap:4px;align-items:center}.freq button{width:42px;height:42px}.save-next{height:46px}</style></head><body>'+
 '<div class="app"><header class="topbar"><div class="brand"><h2>COMPASS · Actions</h2></div><nav><button id="resetViewBtn" hidden>Exit Images Only</button><button id="backBtn">Setup</button><button id="endBtn">End Session</button></nav></header>'+
 '<main class="page active" id="runPage"><div id="runGrid" class="run-grid">'+
 '<section class="run-card material-card"><div class="material-top"><h2 class="run-title">Student Material</h2><span class="material-tag">Target · Receptive</span></div>'+
 '<div class="material-main"><div id="sdPrompt" class="sd-card">Show me sleeping.</div><div id="stageContext">Starter</div><div id="taskStage"><div class="choice-grid" style="--ncols:3">'+pictures+'</div></div><p id="studentSelection"></p></div><div id="materialHint" class="material-foot">Picture note</div></section>'+
 '<section class="run-card score-card"><div class="score-head"><h2 class="run-title">Trial & Scoring</h2><button id="imagesOnlyBtn">▣ Images Only</button></div><div class="score-stats"><div class="stat">Correct 0</div><div class="stat">Incorrect 0</div><div class="stat">Prompted 0</div></div>'+
 '<p class="trial-id">Step 1/8</p><div class="score-buttons"><button id="scoreCorrect">Target Correct</button><button>Target Incorrect</button><button>Target Prompted</button></div>'+
 '<div class="behavior-block"><div class="behavior-head">Behavior Tracking <button>Select Behaviors</button></div><div class="behavior-list" id="behaviorList">'+rows+'</div></div>'+
 '<button class="save-next" id="saveNextBtn">Save & Next Step</button></section></div></main></div>'+
 '<script>const $=id=>document.getElementById(id);let imagesOnly=false;let scores=0;window.scoreValue=()=>scores;'+
 '$("scoreCorrect").addEventListener("click",()=>scores++);'+
 "$('imagesOnlyBtn').addEventListener('click',()=>{imagesOnly=true;$('runGrid').classList.add('no-controls');$('resetViewBtn').hidden=false;});\n"+
 "$('resetViewBtn').addEventListener('click',()=>{imagesOnly=false;$('runGrid').classList.remove('no-controls');$('resetViewBtn').hidden=true;});"+
 '</script></body></html>';
 const patched=await standard.standardize(base);
 assert(patched.includes('function setImagesOnlyView(enabled)'),'Expected original Actions toggle replaced');
 assert(!patched.includes("imagesOnly=true;$('runGrid').classList.add('no-controls');"),'Old one-way handler remains');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080}]){
   const page=await browser.newPage({viewport});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(patched,{waitUntil:'load'});
   const before=await page.evaluate(()=>({rows:document.querySelector('.behavior-list').children.length,scroll:document.querySelector('.behavior-list').scrollHeight>document.querySelector('.behavior-list').clientHeight+2,
     save:document.querySelector('#saveNextBtn').getBoundingClientRect().bottom<=innerHeight+2,
     photoHeight:document.querySelector('.stim-card img').getBoundingClientRect().height}));
   assert.equal(before.rows,5);assert(!before.scroll,'5 behaviors must not scroll');assert(before.save,'Save must remain visible');
   await page.click('#scoreCorrect');
   await page.click('#imagesOnlyBtn');
   const active=await page.evaluate(()=>{
     const image=document.querySelector('.stim-card img').getBoundingClientRect();
     const material=document.querySelector('.material-card').getBoundingClientRect();
     return {hidden:getComputedStyle(document.querySelector('.score-card')).display==='none',
       text:document.querySelector('#imagesOnlyBtn').textContent,parent:document.querySelector('#imagesOnlyBtn').parentElement.className,
       widthRatio:material.width/innerWidth,imageHeight:image.height,verticalScroll:document.documentElement.scrollHeight>innerHeight+2,
       photoVisible:image.bottom<=innerHeight+2,score:window.scoreValue()};
   });
   assert(active.hidden&&active.text.includes('Exit Images Only')&&active.parent.includes('material-top'),'Images Only must hide scoring while retaining same exit button');
   assert(active.widthRatio>.90,'Student material must use full page width');
   assert(active.imageHeight>before.photoHeight*1.4,'Pictures must enlarge in Images Only');
   assert(!active.verticalScroll&&active.photoVisible,'Image-only should not scroll vertically');
   assert.equal(active.score,1);
   await page.click('#imagesOnlyBtn');
   const after=await page.evaluate(()=>({
     scoreVisible:getComputedStyle(document.querySelector('.score-card')).display!=='none',
     noControls:document.querySelector('#runGrid').classList.contains('no-controls'),
     text:document.querySelector('#imagesOnlyBtn').textContent,parent:document.querySelector('#imagesOnlyBtn').parentElement.className,
     rows:document.querySelector('.behavior-list').children.length,score:window.scoreValue()}));
   assert(after.scoreVisible&&!after.noControls&&!after.text.includes('Exit')&&after.parent.includes('score-head'),'Same button must exit Images Only');
   assert.equal(after.rows,5);assert.equal(after.score,1);assert.deepEqual(errors,[]);
   console.log('PAGE2_IMAGES_ONLY_PASS '+JSON.stringify({viewport,before,active,after}));
   await page.close();
  }
 }finally{await browser.close()}
 console.log('PAGE2_IMAGES_ONLY_STANDARD_PASS');
}
main().catch(e=>{console.error('PAGE2_IMAGES_ONLY_FAIL',e.stack||e);process.exit(1)});
