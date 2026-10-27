'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'compass-fine-motor-imitation-v25.js'),'utf8');
const style=fs.readFileSync(path.join(root,'compass-fine-motor-imitation-v25.css'),'utf8');
const standard=fs.readFileSync(path.join(root,'compass-page2-standard.js'),'utf8');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-127-FINE-MOTOR-IMITATION&test=1';
(async()=>{
 assert.doesNotThrow(()=>new Function(code),'Fine Motor adapter must parse');
 const response=await fetch(url,{signal:AbortSignal.timeout(35000)});
 assert.equal(response.status,200,'Original Fine Motor HTML should load');
 const raw=await response.text();
 assert(raw.includes('COMPASS_PROGRAM_CONFIG')&&raw.includes('fmi-card'),'Fine Motor source absent');
 const scope={};
 vm.runInNewContext(standard,{window:scope,fetch:async resource=>({
  ok:true,text:async()=>resource.includes('.css')?style:code
 })});
 const html=await scope.COMPASS_PAGE2_STANDARD.standardize(raw);
 assert(html.includes('compass-fine-motor-imitation-v25-ui'),'V25 injected stylesheet absent');
 assert(html.includes('compass-fine-motor-imitation-v25-logic'),'V25 injected script absent');
 assert.equal(await scope.COMPASS_PAGE2_STANDARD.standardize(html),html,'Adapter must be idempotent');
 const chrome=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080}]){
   const page=await chrome.newPage({viewport});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    window.__FMI_TEST_CALLS__=[];
    window.__COMPASS_STUDENT_RUNTIME__={
      context:{primary_behaviors:[],secondary_behaviors:[]},
      markProgramComplete(){window.__FMI_TEST_MARK__=true},
      autoSave:async(reason)=>{window.__FMI_TEST_CALLS__.push({action:'autoSave',reason,events:window.__COMPASS_TRIAL_CAPTURE__?.getEvents?.()});return {ok:true,session_id:'synthetic-fmi-test'};},
      securePost:async(payload)=>{window.__FMI_TEST_CALLS__.push(payload);return {ok:true,probe_saved:true};}
    };
   });
   await page.route('**/compass-program-runner?*',r=>r.fulfill({status:200,contentType:'text/html',body:html}));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.locator('#bpRun').waitFor({state:'visible',timeout:15000});
   const setup=await page.evaluate(()=>({
    code:window.COMPASS_PROGRAM_CONFIG?.program_code,
    targets:window.COMPASS_PROGRAM_CONFIG?.targets?.length,
    benchmarking:[...document.querySelectorAll('select')].filter(x=>[...x.options].some(o=>o.text.includes('Foundational Hand'))).map(x=>({id:x.id,count:x.options.length})),
    circuit:!!document.querySelector('#setupChain option[value="CIRCUIT"]'),
    ready:window.__COMPASS_FMI_V25__?.ready,
    oldOuterVisible:getComputedStyle(document.querySelector('.main>.topbar')).display!=='none'
   }));
   assert(setup.code==='CP-127-FINE-MOTOR-IMITATION'&&setup.targets===40&&setup.ready&&setup.circuit&&setup.benchmarking.length===1&&setup.benchmarking[0].count===4&&!setup.oldOuterVisible,'Setup invalid: '+JSON.stringify(setup));
   const benchmarkId=setup.benchmarking[0].id;
   await page.locator('#'+benchmarkId).selectOption('1');
   await page.locator('#setupChain').selectOption('CIRCUIT');
   await page.locator('#bpRun').click();
   await page.locator('#bpPageTwo').waitFor({state:'visible'});
   const material=await page.evaluate(()=>({
    title:document.querySelector('#bpMaterial .fmi-card h3')?.textContent,
    images:document.querySelectorAll('#bpMaterial img').length,
    total:Number(document.querySelector('#trialTotal').textContent),
    instruction:document.querySelector('#bpInstruction').textContent,
    widths:[document.querySelector('#bpMaterial').getBoundingClientRect().width,document.querySelector('#bpScoring').getBoundingClientRect().width]
   }));
   assert(material.total===10&&material.title&&material.images===0&&material.instruction.includes('Do this'),'Real-object presentation invalid '+JSON.stringify(material));
   const ratio=material.widths[0]/(material.widths[0]+material.widths[1]);assert(ratio>.61&&ratio<.75,'Incorrect landscape columns '+ratio);
   await page.locator('#bpImages').click();
   const p=await page.evaluate(()=>({hidden:getComputedStyle(document.querySelector('#bpScoring')).display==='none',exit:document.querySelector('#bpImages').textContent.includes('Exit Materials Only')}));
   assert(p.hidden&&p.exit,'Materials-only mode failed');
   await page.locator('#bpImages').click();
   for(const count of [1,3,5,8]){
    await page.evaluate(n=>setBehaviorDefinitions(Array.from({length:n},(_,i)=>({key:'be'+i,label:'Extended fine motor session behavior label '+i}))),count);
    const result=await page.evaluate(()=>{
     const list=document.querySelector('#behaviorItems'),cs=getComputedStyle(list);
     return {count:list.querySelectorAll('.behavior').length,scroll:/(scroll|auto)/.test(cs.overflowY)&&list.scrollHeight>list.clientHeight+2};
    });
    assert.equal(result.count,count);
    if(count<=5)assert(!result.scroll,'1–5 behaviors must fit without internal scroll: '+count);
   }
   await page.evaluate(()=>setBehaviorDefinitions([{key:'be0',label:'Elopement'}]));
   await page.locator('#behaviorItems .plus').click();
   assert.equal(await page.locator('#behaviorItems .count').innerText(),'1');
   const scoring=['correctBtn','promptedBtn','incorrectBtn','correctBtn'];
   for(let i=0;i<material.total;i++){
    await page.locator('#'+scoring[i%scoring.length]).click();
    if(i<material.total-1)await page.waitForFunction(value=>Number(document.querySelector('#trialNum').textContent)===value,i+2,{timeout:3500});
   }
   await page.waitForFunction(()=>window.__COMPASS_FMI_V25__?.getState().saveState==='saved',null,{timeout:6500});
   const state=await page.evaluate(()=>({state:window.__COMPASS_FMI_V25__.getState(),calls:window.__FMI_TEST_CALLS__,marked:window.__FMI_TEST_MARK__,next:!document.querySelector('#bpNextProgram').disabled}));
   assert(state.state.completed&&state.state.steps===10&&state.state.events.length===10&&state.calls.length===1&&state.next&&state.marked,'Complete/save capture failed '+JSON.stringify(state));
   assert(state.state.events.some(x=>x.result==='prompted'),'Prompted result must persist');
   await page.locator('#bpBack').click();
   await page.locator('#bpPageOne').waitFor({state:'visible'});
   await page.locator('#'+benchmarkId).selectOption('4');
   await page.locator('#fmiV25Mode').selectOption('probe');
   await page.locator('#bpRun').click();
   const probeTotal=Number(await page.locator('#trialTotal').innerText());assert.equal(probeTotal,10,'Benchmark 4 must have 10 probe targets');
   for(let i=0;i<probeTotal;i++){
    await page.locator('#correctBtn').click();
    if(i<probeTotal-1)await page.waitForFunction(value=>Number(document.querySelector('#trialNum').textContent)===value,i+2,{timeout:3500});
   }
   await page.waitForFunction(()=>window.__COMPASS_FMI_V25__?.getState().saveState==='saved',null,{timeout:6500});
   const probe=await page.evaluate(()=>({state:window.__COMPASS_FMI_V25__.getState(),call:window.__FMI_TEST_CALLS__.find(x=>x.action==='save_probe')}));
   assert(probe.state.probe&&probe.state.events.length===10&&probe.state.events.every(x=>x.probe&&x.trial_type==='T')&&probe.call?.trial_events?.length===10,'Probe must save separately: '+JSON.stringify(probe));
   assert.deepEqual(errors,[],'Browser errors '+JSON.stringify(viewport));
   console.log('FMI_V25_VIEWPORT_PASS '+JSON.stringify({viewport,targets:setup.targets,benchmarks:4,ratio,teaching:state.state.steps,probe:probe.state.steps}));
   await page.close();
  }
 }finally{await chrome.close()}
 console.log('FMI_V25_STRESS_TEST_PASS');
})().catch(e=>{console.error('FMI_V25_STRESS_TEST_FAIL',e.stack||e);process.exit(1)});
