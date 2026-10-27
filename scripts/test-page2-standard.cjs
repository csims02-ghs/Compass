'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'compass-page2-standard.css'),'utf8');
const helper=fs.readFileSync(path.join(root,'compass-page2-standard.js'),'utf8');
const hub=fs.readFileSync(path.join(root,'program-hub.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(css.includes('grid-template-columns:minmax(0,7fr) minmax(270px,3fr)'), '70/30 grid rule missing');
assert(css.includes('.behavior-row:nth-child(6)'), 'More-than-five behavior overflow rule missing');
assert(css.includes('.save-next{margin-top:auto'), 'Save button anchoring missing');
assert(hub.includes('COMPASS_PAGE2_STANDARD.standardize(original)'), 'Program Hub runtime integration missing');
assert(index.includes('injectOfflineDock(await window.COMPASS_PAGE2_STANDARD.standardize(rj.html)'), 'Offline pack integration missing');
assert(index.includes('return await window.COMPASS_PAGE2_STANDARD.standardize(h)'), 'Assigned program integration missing');
assert(index.includes('win.document.write(await window.COMPASS_PAGE2_STANDARD.standardize(payload.html))'), 'Catalog preview integration missing');

async function main(){
 const context={window:{},fetch:async()=>({ok:true,text:async()=>css})};vm.runInNewContext(helper,context);
 const standard=context.window.COMPASS_PAGE2_STANDARD;
 const dummy='<html><head><title>Demo</title></head><body><main id="runPage"><div class="run-grid"></div><div id="behaviorList"></div></main></body></html>';
 const processed=await standard.standardize(dummy);
 assert(processed.includes('id="compass-definitive-page2-v1"'));
 assert.equal((processed.match(/id="compass-definitive-page2-v1"/g)||[]).length,1);
 assert.equal(await standard.standardize(processed),processed,'Standard must not double inject');
 assert.equal(await standard.standardize('<html><head></head><body>Legacy</body></html>'),'<html><head></head><body>Legacy</body></html>','Incompatible runners must remain unchanged');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
   for(const viewport of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080}]){
    const page=await browser.newPage({viewport});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    const setup=n=>`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;font:15px Arial}
    .app{height:100dvh;display:flex;flex-direction:column}.topbar{height:100px;flex:0 0 100px}
    .page{display:flex;flex:1;min-height:0}.run-grid{flex:1;display:grid;min-height:0;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:8px}
    .run-card{display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden;padding:16px}
    .score-card{gap:9px}.run-title{font-size:14px}.material-main{flex:1}.sd-card{padding:14px}
    .score-head{display:flex;justify-content:space-between}.score-stats{display:grid;grid-template-columns:repeat(3,1fr)}
    .stat{padding:5px;border:1px solid #ddd}.stat small,.stat strong{display:block}
    .score-buttons{display:grid;gap:6px}.score-buttons button{min-height:48px}
    .behavior-block{display:flex;flex:1;flex-direction:column}.behavior-head{display:flex;justify-content:space-between}
    .behavior-list{display:flex;flex-direction:column;overflow:auto}
    .behavior-row{display:grid;grid-template-columns:1fr auto;align-items:center}.freq{display:flex;align-items:center;gap:5px}
    .freq button{width:40px;height:40px}.save-next{min-height:44px}
    </style></head><body><div class="app"><header class="topbar">Program Controls</header><main class="page" id="runPage">
     <div id="runGrid" class="run-grid"><section class="run-card material-card">
      <div class="material-top"><h2 class="run-title">Student Material</h2><span class="material-tag">Target · Receptive</span></div>
      <div class="material-main"><div class="sd-card">Show me eating.</div><div class="material-grid">Student images</div></div>
      <div class="material-foot">Staff verifies correctness before scoring.</div>
     </section><section class="run-card score-card">
      <div class="score-head"><h2 class="run-title">Trial &amp; Scoring</h2><button class="btn">Images Only</button></div>
      <div class="score-stats"><div class="stat"><small>Correct</small><strong>0</strong></div><div class="stat"><small>Incorrect</small><strong>0</strong></div><div class="stat"><small>Prompted</small><strong>0</strong></div></div>
      <p class="trial-id">Step 1/8 · Target · Eating</p><p class="mastery-run-progress">Mastery data will sync when connected.</p>
      <div><p class="score-label">SCORE TEACHING STEP</p><div class="score-buttons"><button>Target Correct</button><button>Target Incorrect</button><button>Target Prompted</button></div></div>
      <div class="behavior-block"><div class="behavior-head"><span>BEHAVIOR TRACKING</span><button>Select Behaviors</button></div>
       <div role="region" class="behavior-list" id="behaviorList">${Array.from({length:n},(_,i)=>`<div class="behavior-row"><label><span>${['Noncompliance','Elopement','Property Destruction in the Classroom','Work Refusal','Aggression','Self Injury','Out of Area','Tantrum'][i]}</span></label><div class="freq"><button>−</button><output>0</output><button>+</button></div></div>`).join('')}</div>
      </div><p class="validation"></p><button class="save-next">Save &amp; Next Step</button>
     </section></div></main></div></body></html>`;
    for(const behaviors of [1,3,5,8]){
      await page.setContent(setup(behaviors));
      await page.addStyleTag({content:css});
      const m=await page.evaluate(()=>{
       const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
       const grid=document.querySelector('.run-grid'),material=document.querySelector('.material-card'),score=document.querySelector('.score-card');
       const list=document.querySelector('.behavior-list'),rows=[...list.querySelectorAll('.behavior-row')];
       const save=document.querySelector('.save-next');
       const controls=rows.map(r=>{const buttons=[...r.querySelectorAll('.freq button')];return {row:rect(r),minus:rect(buttons[0]),plus:rect(buttons[1]),label:rect(r.querySelector('label')),count:rect(r.querySelector('output'))}});
       return {grid:rect(grid),material:rect(material),score:rect(score),list:rect(list),save:rect(save),controls,
         listScroll:list.scrollHeight>list.clientHeight+2,scoreScroll:score.scrollHeight>score.clientHeight+2,ratio:material.getBoundingClientRect().width/(material.getBoundingClientRect().width+score.getBoundingClientRect().width)};
      });
      assert(m.ratio>=.60&&m.ratio<=.74,'Student / staff panel ratio not acceptable '+JSON.stringify({viewport,behaviors,ratio:m.ratio}));
      assert(m.controls.every(x=>x.minus.width>=38&&x.plus.width>=38&&x.minus.height>=38&&x.plus.height>=38),'Touch controls too small');
      assert(m.controls.every(x=>x.plus.right<=m.score.right+1&&x.row.right<=m.score.right+1),'Behavior count controls overflow right pane');
      assert(m.controls.every(x=>Math.abs(x.minus.y-x.plus.y)<=2),'Behavior plus/minus unaligned');
      if(behaviors<=5){
        assert(!m.listScroll,'Five or fewer behaviors must not scroll internally');
        assert(m.controls.every(x=>x.row.bottom<=m.score.bottom+1),'One of five behavior rows is clipped');
      }
      assert(m.save.bottom<=m.score.bottom+1,'Save action clipped from score pane');
      assert(m.save.bottom<=viewport.height+2,'Save action leaves screen');
      if(behaviors===5)console.log('PAGE2_FIVE_BEHAVIOR_LAYOUT_PASS',JSON.stringify({viewport,ratio:m.ratio,saveBottom:m.save.bottom,scoreBottom:m.score.bottom,scroll:m.scoreScroll,rowHeight:m.controls[0].row.height}));
    }
    assert.equal(errors.length,0,'Browser errors: '+errors.join('; '));
    await page.close();
   }
 }finally{await browser.close()}
 console.log('PAGE2_STANDARD_PASS');
}
main().catch(err=>{console.error('PAGE2_STANDARD_FAIL',err.stack||err);process.exit(1)});
