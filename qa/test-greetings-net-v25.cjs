const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-GREETINGS-NET&format=html';
(async()=>{
 const response=await fetch(url);assert.equal(response.status,200,'staged Greetings runner should be reachable in read-only QA');
 const html=await response.text();const server=http.createServer((_req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900}]){
    const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      window.COMPASS_CONTEXT={studentId:'synthetic-greeting',studentCompassProgramId:'synthetic-greeting-assignment',assignmentId:'synthetic-greeting-assignment',behaviors:['Noncompliance'],iepGoals:[{id:'g',title:'Synthetic greeting IEP goal'}],instanceConfig:{}};
      window.qaCalls=[];window.rejectSave=false;
      window.__COMPASS_STUDENT_RUNTIME__={context:{student_id:'synthetic-greeting',assignment_id:'synthetic-greeting-assignment',primary_behaviors:['Noncompliance'],iep_goals:[{id:'g',title:'Synthetic greeting IEP goal'}],targets:[]},
      securePost:async p=>{window.qaCalls.push({action:p.action,...p});if(window.rejectSave)throw Error('synthetic cloud rejection');if(p.action==='load_mastery')return{ok:true,target_name:p.target_name,qualifying_dates:0,minimum_dates:3,mastered:false};if(p.action==='save_setup')return{ok:true,saved:true,programSetup:p.setup};if(p.action==='save_probe')return{ok:true,probe_saved:true,probe_id:'synthetic-probe'};throw Error('unexpected secure action '+p.action)},
      saveSession:async p=>{window.qaCalls.push({action:'save_session',...p});if(window.rejectSave)throw Error('synthetic cloud rejection');return{ok:true,session_id:'synthetic-session',saved_trial_events:p.trial_events.length}}};
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:30000});
    const C=await page.evaluate(()=>JSON.parse(document.getElementById('compassConfig').textContent));assert.equal(C.targets.length,12);assert.equal(C.benchmarks.length,2);assert.equal(C.net_rules.length,8);
    assert.equal(await page.locator('#benchmarkSelect option').count(),2,errors.join(';'));
    for(const [b,n] of [['1',10],['2',2]]){await page.locator('#benchmarkSelect').selectOption(b);assert.equal(await page.locator('#targetSelect option').count(),n,'benchmark '+b);}
    await page.locator('#benchmarkSelect').selectOption('1');
    assert.equal(await page.locator('#chainSelect').inputValue(),'TTTT','Momentum is default');
    assert.equal((await page.locator('.chain-preview-heading strong').innerText()).trim(),'Momentum DTI Chain');
    const subtitle=await page.locator('.chain-preview-heading small').innerText();
    assert(subtitle.includes('T = Target')&&subtitle.includes('D = Distractor')&&subtitle.includes('4 teaching steps = 1 complete run'),subtitle);
    assert.equal(await page.locator('#chainPreviewSteps .chain-step').count(),4);
    assert.equal(await page.locator('#chainPreviewSteps .chain-step.is-target').count(),4);
    const dims=await page.locator('#chainPreviewSteps .chain-step').first().evaluate(el=>{let r=el.getBoundingClientRect(),s=getComputedStyle(el);return{width:r.width,height:r.height,borderRadius:s.borderRadius,background:s.backgroundColor}});
    assert.equal(dims.width,40);assert.equal(dims.height,40);assert(dims.background.includes('224')||dims.background.includes('237'),JSON.stringify(dims));
    await page.locator('#chainSelect').selectOption('TTDTDDTT');assert.equal(await page.locator('#chainPreviewSteps .chain-step').count(),8);assert.equal(await page.locator('#chainPreviewSteps .is-distractor').count(),3);assert((await page.locator('.chain-preview-heading small').innerText()).includes('8 teaching steps = 1 complete run'));await page.locator('#chainSelect').selectOption('TTTTT');assert.equal(await page.locator('#chainPreviewSteps .chain-step').count(),5);
    assert((await page.locator('.chain-preview-heading strong').innerText()).includes('IEP Chain'));
    await page.locator('#chainSelect').selectOption('TTTT');
    assert.equal(await page.locator('#modeSelect').inputValue(),'generalization','NET is initial teaching context');
    assert.equal(await page.locator('#greetingRoute option').count(),6);
    assert.equal(await page.locator('#saveSetupBtn').count(),1);
    assert.equal(await page.locator('#compassV251Tools').count(),0);
    await page.locator('#greetingRoute').selectOption('Hallway and Transitions');
    await page.locator('#saveSetupBtn').click();
    await page.waitForFunction(()=>document.getElementById('saveSetupStatus')?.textContent.includes('Saved to this student'),null,{timeout:6000});
    const setup=await page.evaluate(()=>window.qaCalls.find(x=>x.action==='save_setup'));
    assert.equal(setup.setup.greetingRoute,'Hallway and Transitions');assert.equal(setup.setup.chainSelect,'TTTT');
    await page.locator('#runBtn').click();
    assert.equal(await page.locator('#runPage').evaluate(x=>x.classList.contains('active')),true);
    assert((await page.locator('#greetingStaffInfo').innerText()).includes('Natural cue:'));
    assert((await page.locator('#greetingStaffInfo').innerText()).includes('Clinical rule:'));
    assert.equal(await page.locator('#greetCueSelect').inputValue(),'Not confirmed');
    assert.equal(await page.locator('[data-score="correct"]').isDisabled(),true,'NET scores locked without natural cue');
    await page.locator('#greetNoOpportunity').click();
    assert((await page.locator('#greetOpportunityStatus').innerText()).includes('No natural opportunity recorded'));
    assert.equal(await page.locator('[data-score="correct"]').isDisabled(),true);
    assert((await page.locator('#trialLabel').innerText()).includes('Step 1/4'),'no-op does not advance or count as teaching');
    await page.locator('#greetCueSelect').selectOption('Yes');
    assert.equal(await page.locator('[data-score="correct"]').isEnabled(),true);
    await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
    for(let i=1;i<4;i++){await page.locator('#greetCueSelect').selectOption('Yes');await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();}
    await page.waitForFunction(()=>window.qaCalls.some(x=>x.action==='save_session'),null,{timeout:7000});
    const saved=await page.evaluate(()=>window.qaCalls.find(x=>x.action==='save_session'));
    assert.equal(saved.trial_events.length,4);assert.equal(saved.counts.independent_correct,4);
    assert.equal(saved.v25_run.greeting_steps.length,4);
    assert.equal(saved.v25_run.no_natural_opportunities.length,1);
    assert.equal(saved.v25_run.greeting_steps[0].route,'Hallway and Transitions');
    assert.equal(saved.v25_run.net_generalization,true);
    assert.equal(await page.locator('#nextProgramBtn').isEnabled(),true);
    await page.locator('#backBtn').click();
    await page.locator('#modeSelect').selectOption('teaching');
    await page.locator('#benchmarkSelect').selectOption('2');await page.locator('#targetSelect').selectOption('11');
    await page.locator('#chainSelect').selectOption('T');
    await page.locator('#runBtn').click();
    assert((await page.locator('#taskStage').innerText()).includes('Practice'));
    assert.equal(await page.locator('[data-score="correct"]').isEnabled(),true,'DTI role-play does not require natural-cue flag');
    await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
    await page.waitForFunction(()=>window.qaCalls.filter(x=>x.action==='save_session').length>=2,null,{timeout:7000});
    const dti=await page.evaluate(()=>window.qaCalls.filter(x=>x.action==='save_session')[1]);assert.equal(dti.v25_run.net_generalization,false);
    await page.locator('#backBtn').click();
    await page.locator('#modeSelect').selectOption('generalization');await page.locator('#chainSelect').selectOption('T');
    await page.locator('#runBtn').click();await page.locator('#greetCueSelect').selectOption('Yes');await page.locator('#greetPromptSelect').selectOption('Model');
    await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
    assert((await page.locator('#validation').innerText()).includes('A staff prompt was used'), 'Independent correct must reject staff prompting');
    assert((await page.locator('#trialLabel').innerText()).includes('Step 1/1'));
    await page.locator('[data-score="prompted"]').click();await page.locator('#saveNextBtn').click();
    await page.waitForFunction(()=>window.qaCalls.filter(x=>x.action==='save_session').length>=3,null,{timeout:7000});
    const prompted=await page.evaluate(()=>window.qaCalls.filter(x=>x.action==='save_session')[2]);assert.equal(prompted.counts.prompted_correct,1);assert.equal(prompted.counts.independent_correct,0);
    await page.locator('#backBtn').click();
    await page.locator('#circuitSelect').selectOption('probe');
    await page.locator('#benchmarkSelect').selectOption('2');
    assert.equal(await page.locator('#targetSelect').isDisabled(),true,'Full benchmark probe must lock target selection');
    await page.locator('#runBtn').click();
    for(let i=0;i<2;i++){await page.locator('#greetCueSelect').selectOption('Yes');await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();}
    await page.waitForFunction(()=>window.qaCalls.some(x=>x.action==='save_probe'),null,{timeout:7000});
    const probe=await page.evaluate(()=>window.qaCalls.find(x=>x.action==='save_probe'));assert.equal(probe.events.length,2);assert.equal(probe.benchmark_key,'2');
    await page.locator('#backBtn').click();
    await page.locator('#circuitSelect').selectOption('na');await page.locator('#benchmarkSelect').selectOption('1');
    await page.locator('#modeSelect').selectOption('generalization');await page.locator('#chainSelect').selectOption('T');
    await page.evaluate(()=>window.rejectSave=true);
    await page.locator('#runBtn').click();await page.locator('#greetCueSelect').selectOption('Yes');
    await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
    await page.waitForFunction(()=>document.getElementById('validation')?.textContent.includes('save failed'),null,{timeout:7000});
    assert.equal(await page.locator('#nextProgramBtn').isHidden(),true,'Do not navigate when cloud save fails');
    await page.evaluate(()=>window.rejectSave=false);
    await page.locator('#saveNextBtn').click();await page.waitForFunction(()=>!document.getElementById('nextProgramBtn').disabled,null,{timeout:7000});
    assert.equal(errors.length,0,errors.join('; '));
    console.log('PASS Greetings NET V25',viewport.width+'x'+viewport.height,'Momentum TTTT / 40px tiles','12 targets','NET no-op skipped','4 saved target steps','DTI separate','save reject/retry');
    await page.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error(e);process.exit(1)});
