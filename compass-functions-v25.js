/* COMPASS Functions V25: isolated production interface for written/visual directions.
   Leaves all 40 targets, historic trials, assignment IDs, and old runner HTML intact. */
(function(){
'use strict';
const C=window.COMPASS_PROGRAM_CONFIG||{};
if(C.program_code!=='CP-DIR-VISUAL-087'||window.__COMPASS_FUNCTIONS_V25__)return;
const $=id=>document.getElementById(id);
const main=document.querySelector('.app .main');
const setup=document.querySelector('.program-setup');
const workspace=$('workspace'), behaviorBar=$('behaviorBar');
const top=workspace?.querySelector('.trial-top'), response=workspace?.querySelector('.response-row');
const choices=$('choices');
if(!main||!setup||!workspace||!behaviorBar||!top||!response||!choices)throw Error('Functions V25 requires its matching production runner');
document.documentElement.classList.add('bp-v25','functions-v25');
const targets=(Array.isArray(C.targets)?C.targets:[]).filter(t=>t&&typeof t.name==='string');
const standards=Array.isArray(C.compass_v25_standard?.benchmarks)?C.compass_v25_standard.benchmarks:[];
const benchmarks=standards.length?standards:[1,2,3,4].map(n=>({id:'FUNC-B'+n,number:n,name:'Benchmark '+n,target_count:10}));
function members(b){return targets.filter(t=>Number(t.metadata?.benchmark_number??t.metadata?.benchmark)===Number(b.number));}
const root=document.createElement('div');root.id='bpRoot';
root.innerHTML=
'<header id="bpHeader"><div><div class="bp-title">Functions <span class="bp-subtitle">· COMPASS V25 Instructional Program</span></div><div class="bp-subtitle" id="bpStepText">Program Setup → Run Program</div></div><nav class="bp-header-actions"><button class="bp-btn" id="bpBack" type="button" hidden>← Setup</button><button class="bp-btn" id="bpEnd" type="button">End Session</button></nav></header>'+
'<section class="bp-page" id="bpPageOne"><div class="bp-panel func-setup-panel" id="bpSetupMount"><h2 class="bp-h3">Program Setup</h2><div class="func-settings"><label>Benchmark<select id="funcBenchmark"></select></label><label>Circuit<select id="funcCircuit"><option value="teach">N/A · Teaching</option><option value="probe">Probe Benchmark</option></select></label><label>Qualifying mastery dates<input id="funcDays" type="number" min="1" max="30" value="3"></label><label>Runs per selection<input value="1 complete DTI chain" disabled aria-label="One full chain per run"></label></div></div><aside class="bp-panel bp-guide" id="bpInstructions"><span class="bp-chip">FUNCTIONS · V25</span><h2>Instructions</h2><ol><li>Prepare the actual accessible written directions, picture schedule, checklist, or routine cue from the student’s materials. Text on screen does not substitute for a pictorial visual support.</li><li>Gain attention and present the selected direction. Allow appropriate response time (typically 3–5 seconds), honoring processing and motor needs.</li><li><b>Application:</b> observe the student following the direction. <b>Expressive:</b> accept speech, AAC, pointing or an approved response method as appropriate to the target and IEP.</li><li>Score every Target (T) and reviewed Distractor (D) step independently. Prompts are recorded separately from independent correct responses.</li><li>Behavior tracking uses student-assigned behaviors (up to eight). Teaching mastery requires the configured percentage across distinct qualifying dates; probes do not count.</li></ol><button class="bp-btn primary bp-run" id="bpRun" type="button">Run Program →</button></aside></section>'+
'<section class="bp-page" id="bpPageTwo" hidden><div class="bp-panel" id="bpMaterial"><div class="bp-panel-head"><h2 class="bp-h3">Student Material</h2></div><div id="bpContext" role="status"></div><div id="funcMaterial" aria-live="polite"><div class="func-material-chip" id="funcMaterialKind">Direction</div><div id="funcPrompt">Ready</div><div id="funcSupport"></div><ol id="funcSteps" hidden></ol></div><div id="funcStaffReminder">Staff: present the matching individualized accessible cue or real materials. Observe the actual response.</div></div><aside class="bp-panel" id="bpScoring"><div class="bp-panel-head"><h2 class="bp-h3">Trial &amp; Scoring</h2><button class="bp-btn" id="bpImages" type="button" aria-pressed="false">▣ Materials Only</button></div><div id="bpScoringMount"></div><div id="bpBehaviorMount"></div><div id="bpSaveStatus" role="status" aria-live="polite">Choose Run Program to begin.</div><button class="bp-btn" type="button" id="funcRetry" hidden>Retry Save</button><button class="bp-btn primary" type="button" id="bpNextProgram" hidden disabled>Next Program →</button></aside></section>';
main.appendChild(root);
const mount=$('bpSetupMount');setup.classList.add('bp-setup');mount.appendChild(setup);
const body=$('setupBody');if(body)body.hidden=false;
$('bpScoringMount').append(top,response);
$('bpBehaviorMount').appendChild(behaviorBar);
workspace.hidden=true;workspace.style.display='none';
choices.hidden=true;choices.style.display='none';
const benchmark=$('funcBenchmark');
benchmarks.forEach((b,i)=>benchmark.add(new Option((i+1)+' · '+(b.name||'Benchmark '+(i+1)),String(i))));
function currentBenchmark(){return benchmarks[Number(benchmark.value)||0]||benchmarks[0];}
function optionsForBenchmark(){
 const selection=$('setupTarget');if(!selection)return;
 const prior=selection.value;selection.replaceChildren();
 const allowed=members(currentBenchmark());
 allowed.forEach(t=>selection.add(new Option(t.name,t.name)));
 if(allowed.some(t=>t.name===prior))selection.value=prior;
 if(typeof updatePreview==='function')updatePreview();
}
benchmark.addEventListener('change',optionsForBenchmark);optionsForBenchmark();
if($('setupScoring'))$('setupScoring').value='staff';
const skills=$('setupSkillType');if(skills){
 const available=['Application','Expressive'];
 [...skills.options].forEach(o=>{o.hidden=!available.includes(o.value)});
 if(!available.includes(skills.value))skills.value='Application';
}
const init=$('setupMastery');if(init&&!init.value)init.value=String(C.mastery_pct||80);
const days=$('funcDays');
const linked=window.__COMPASS_STUDENT_RUNTIME__?.context?.instance_config?.programSetup;
if(linked?.masteryTrialsSelect)days.value=String(linked.masteryTrialsSelect);
const imageButton=$('bpImages'), materialHead=$('bpMaterial').querySelector('.bp-panel-head'), scoreHead=$('bpScoring').querySelector('.bp-panel-head');
let imageOnly=false,running=false,complete=false, saving=false, saved=false, queued=false, runKey='', startedAt='', instructionDate='', events=[], seen=new Set(),lastOrdering='',scoredIndex=-1;
function imageView(value){
 imageOnly=!!value;root.classList.toggle('bp-images-only',imageOnly);
 (imageOnly?materialHead:scoreHead).appendChild(imageButton);
 imageButton.textContent=imageOnly?'← Exit Materials Only':'▣ Materials Only';
 imageButton.setAttribute('aria-pressed',String(imageOnly));
}
imageButton.addEventListener('click',()=>imageView(!imageOnly));
function status(value){$('bpSaveStatus').textContent=value;}
function step(){return typeof current==='function'?current():null;}
function currentTarget(q){return targets.find(t=>t.name===q?.animal)||null;}
function display(){
 if(!running)return;
 const q=step(),idx=Number(trial)||0,total=Array.isArray(plan)?plan.length:0;
 if(!q)return;
 const t=currentTarget(q),direction=String(q.custom?q.action:(t?.metadata?.base_target||q.animal||''));
 const kind=q.type==='Distractor'?'Review / D':'Target / T';
 $('bpContext').textContent='Step '+(idx+1)+' / '+total+' · '+kind+' · '+(skills?.value||'Application');
 $('bpStepText').textContent='Run Program · Step '+(idx+1)+' of '+total;
 $('funcMaterialKind').textContent=kind;
 $('funcPrompt').textContent=direction;
 $('funcSupport').textContent=q.custom?'Complete the individualized reviewed distractor direction.':'SD: Present the actual accessible written or visual direction. Observe completion or an approved expressive response.';
 const pieces=direction.split(/\s*(?:→|->)\s*/).map(x=>x.trim()).filter(Boolean), list=$('funcSteps');
 list.hidden=pieces.length<=1;list.replaceChildren();
 if(pieces.length>1)pieces.forEach(part=>{const li=document.createElement('li');li.textContent=part;list.appendChild(li)});
 response.querySelectorAll('.action.correct,.action.incorrect,.action.prompted').forEach(b=>{b.disabled=saving||seen.has(idx)});
}
if(typeof renderAll==='function'){
 const original=renderAll;
 renderAll=function(){original();display();};
}
const sourceCapture=window.__COMPASS_TRIAL_CAPTURE__||{};
sourceCapture.getEvents=()=>events.map(e=>({...e}));
window.__COMPASS_TRIAL_CAPTURE__=sourceCapture;
function backupEvents(){
 return events.map(e=>({...e}));
}
function selectedScore(answer){
 if(!running||saving||complete)return;
 const idx=Number(trial)||0;if(seen.has(idx))return;
 // The original button's inline staffScore() executes before this listener.
 if(typeof lastScored!=='undefined'&&!lastScored)return;
 const q=step(),t=currentTarget(q),responseType=answer==='correct'?'independent_correct':answer==='prompted'?'prompted':'incorrect';
 seen.add(idx);scoredIndex=idx;
 events.push({trial_number:idx+1,trial_type:q?.type==='Distractor'?'D':'T',
  result:responseType,target_key:t?.key||null,
  target_name:String(q?.animal||q?.action||''),benchmark_key:currentBenchmark()?.id||null,
  goal_id:window.__COMPASS_ACTIVE_GOAL_ID__||null,occurred_at:new Date().toISOString(),
  instructional_date:instructionDate,probe:probeMode(),source:'functions_v25_staff_scored'});
 const total=Array.isArray(plan)?plan.length:0;
 status('Step '+events.length+' of '+total+' recorded. Saving…');
 void commitStep(idx===total-1);
}
[['correctBtn','correct'],['incorrectBtn','incorrect'],['promptedBtn','prompted']].forEach(([id,result])=>{
 const el=$(id);if(el)el.addEventListener('click',()=>selectedScore(result));
});
function probeMode(){return $('funcCircuit').value==='probe';}
function probeEvents(){
 return events.map(e=>({target_key:e.target_key,target_name:e.target_name,result:e.result}));
}
async function saveProbe(){
 const runtime=window.__COMPASS_STUDENT_RUNTIME__;
 if(!runtime?.securePost)throw Error('A signed-in student assignment is required to save a benchmark probe.');
 const b=currentBenchmark(),outcome=await runtime.securePost({
  action:'save_probe',benchmark_key:String(b.id),benchmark_name:String(b.name),
  submission_key:runKey,events:probeEvents()
 });
 if(!outcome?.ok||!outcome?.probe_saved)throw Error(outcome?.error||'Probe was not confirmed by COMPASS.');
 return outcome;
}
async function persistSetup(){
 const runtime=window.__COMPASS_STUDENT_RUNTIME__;
 if(!runtime?.securePost)return;
 const fields={setupTarget:$('setupTarget').value,setupBenchmark:String(currentBenchmark().id),
  setupChain:$('setupChain')?.value||C.default_chain||'T,T,D,T,D,D,T,T',
  setupScoring:'staff',setupSkillType:skills?.value||'Application',
  setupMastery:$('setupMastery').value,masteryTrialsSelect:days.value,
  circuitSelect:probeMode()?'Probe Benchmark':'N/A',
  goalSelect:$('setupIepGoal')?.value||''};
 const result=await runtime.securePost({action:'save_setup',setup:fields});
 if(!result?.ok||!result.saved)throw Error(result?.error||'Could not save Program Setup.');
}
async function commitStep(isLast){
 if(saving)return;
 saving=true;$('funcRetry').hidden=true;
 response.querySelectorAll('.action.correct,.action.incorrect,.action.prompted').forEach(b=>{b.disabled=true});
 try{
  const runtime=window.__COMPASS_STUDENT_RUNTIME__;
  if(probeMode()){
   // Never submit a partial probe as teaching; full benchmark is submitted only on its last step.
   if(isLast)await saveProbe();
  }else{
   if(!runtime?.autoSave)throw Error('Authenticated student session saving is unavailable.');
   const ack=await runtime.autoSave(isLast?'program_complete':'step_recorded',true);
   if(!ack?.ok)throw Error('Save not confirmed; check connection and retry.');
  }
  saved=isLast;
  if(isLast){
   complete=true;
   status(probeMode()?'Full benchmark probe saved separately from teaching mastery.':'All T/D steps saved to COMPASS.');
   $('bpNextProgram').hidden=false;$('bpNextProgram').disabled=false;
  }else{
   if(typeof nextTrial==='function')nextTrial();
   status(probeMode()?'Probe step recorded. Complete all ten targets to save the probe.':'Each completed step is saved to COMPASS.');
   display();
  }
 }catch(error){
  status('Save not confirmed: '+String(error?.message||error)+'. Retry before proceeding.');
  $('funcRetry').hidden=false;
 }finally{saving=false;display();}
}
$('funcRetry').addEventListener('click',()=>{if(!saving&&seen.size){const total=Array.isArray(plan)?plan.length:0;void commitStep(scoredIndex>=total-1)}});
function randomizedBenchmarkPlan(){
 const next=members(currentBenchmark()).slice();
 for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]];}
 if(next.length>1&&next.map(t=>t.key).join('|')===lastOrdering){next.push(next.shift());}
 lastOrdering=next.map(t=>t.key).join('|');
 return next.map(t=>({type:'Target',animal:t.name,instruction:t.name,custom:false}));
}
async function launch(){
 if(running&&!complete)return;
 if(members(currentBenchmark()).length!==10){status('Benchmark configuration incomplete: expected 10 verified targets.');return;}
 const mastery=Number($('setupMastery')?.value),required=Number(days.value);
 if(!Number.isFinite(mastery)||mastery<1||mastery>100){status('Enter a valid mastery percentage (1–100).');return;}
 if(!Number.isInteger(required)||required<1||required>30){status('Select 1–30 separate qualifying dates.');return;}
 if(!probeMode()&&!$('setupTarget')?.value){status('Select a target.');return;}
 if($('setupScoring'))$('setupScoring').value='staff';
 // Persist the staff-edited benchmark, goals, mastery and criteria to the student's assignment.
 try{await persistSetup();}catch(error){status('Setup not saved: '+(error?.message||error));return;}
 if(typeof applySetup==='function')applySetup(true);
 if(probeMode()){
  plan=randomizedBenchmarkPlan();trial=0;lastScored=false;tc=ti=tp=dc=di=dp=0;
  if(typeof renderAll==='function')renderAll();
 }
 const total=Array.isArray(plan)?plan.length:0;
 if(!total){status('No valid teaching steps were generated.');return;}
 startedAt=new Date().toISOString();instructionDate=new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'});
 runKey='FUNC-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
 events=[];seen.clear();running=true;complete=false;saved=false;scoredIndex=-1;
 root.classList.add('bp-running');$('bpPageOne').hidden=true;$('bpPageTwo').hidden=false;$('bpBack').hidden=false;
 $('bpNextProgram').hidden=true;$('bpNextProgram').disabled=true;$('funcRetry').hidden=true;
 if(imageOnly)imageView(false);
 status(probeMode()?'Score all ten targets; this probe will not count toward teaching mastery.':'Score each T/D step. Every recorded step will save to COMPASS.');
 display();
}
$('bpRun').addEventListener('click',()=>{void launch()});
function leaveRun(){
 if(saving){status('Saving in progress; remain on this program.');return;}
 if(running&&!complete&&events.length){status('Interrupted run. Save your progress and document the reason in Session Notes before leaving.');return;}
 if(complete&&!saved){status('COMPASS save confirmation is required.');return;}
 running=false;root.classList.remove('bp-running');$('bpPageTwo').hidden=true;$('bpPageOne').hidden=false;$('bpBack').hidden=true;
 if(imageOnly)imageView(false);$('bpStepText').textContent='Program Setup → Run Program';
}
$('bpBack').addEventListener('click',leaveRun);
$('bpEnd').addEventListener('click',()=>{
 if(running&&!complete&&events.length){status('Needs Attention: the run was interrupted. Complete or document it before ending.');return;}
 if(complete&&!saved){status('Complete the cloud save before ending.');return;}
 if(typeof endSession==='function')endSession();
});
$('bpNextProgram').addEventListener('click',()=>{
 if(!complete||!saved)return;
 if(window.parent!==window){
  let origin=location.origin;try{origin=new URL(document.referrer).origin||origin}catch(_){}
  window.parent.postMessage({type:'compass-next-program'},origin);
 }
});
/* Prevent the older primary-five-only behavior renderer from replacing the
   student-specific eight-behavior standard after frame loading. */
const behaviorHost=$('behaviorItems');
let activeBehaviorNames=[];
function stopLegacyBehaviorKeepalive(){
 const id=window.__COMPASS_BEHAVIOR_KEEPALIVE__;
 if(id){clearInterval(id);window.__COMPASS_BEHAVIOR_KEEPALIVE__=null;}
}
function setStudentBehaviors(list){
 const names=[...new Set((Array.isArray(list)?list:[]).map(x=>typeof x==='string'?x:(x?.label||x?.name||''))
  .filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))].slice(0,8);
 activeBehaviorNames=names;
 behaviorDefinitions=names.map((label,i)=>({key:'function'+i,label}));
 stopLegacyBehaviorKeepalive();
 drawBehaviors();
}
function drawBehaviors(){
 if(!behaviorHost)return;
 const found=[...behaviorHost.querySelectorAll(':scope > .behavior')];
 if(found.length===activeBehaviorNames.length&&found.every((el,i)=>el.querySelector('span')?.textContent===activeBehaviorNames[i]))return;
 behaviorHost.replaceChildren();
 for(let i=0;i<activeBehaviorNames.length;i++){
  const name=activeBehaviorNames[i],key='function'+i;
  const item=document.createElement('div');item.className='behavior';
  const dec=document.createElement('button');dec.className='minus';dec.type='button';dec.textContent='−';dec.setAttribute('aria-label','Decrease '+name);
  const label=document.createElement('span');label.textContent=name;
  const value=document.createElement('b');value.className='count';value.id='b'+key;
  const inc=document.createElement('button');inc.className='plus';inc.type='button';inc.textContent='+';inc.setAttribute('aria-label','Increase '+name);
  function currentCount(){
   return Math.max(0,Number((window.__COMPASS_BEHAVIOR_COUNTS__||{})[name])||0);
  }
  value.textContent=String(currentCount());
  function delta(n){
   const c=window.__COMPASS_BEHAVIOR_COUNTS__||(window.__COMPASS_BEHAVIOR_COUNTS__={});
   c[name]=Math.max(0,currentCount()+n);
   if(typeof counts==='object')counts[key]=c[name];
   value.textContent=String(c[name]);
  }
  dec.addEventListener('click',()=>delta(-1));inc.addEventListener('click',()=>delta(1));
  item.append(dec,label,value,inc);behaviorHost.appendChild(item);
 }
}
if(typeof behaviorDefinitions!=='undefined')behaviorDefinitions=[];
drawBehaviors();
const initialAssigned=window.__COMPASS_STUDENT_RUNTIME__?.context?.behaviors||[];
if(initialAssigned.length)setStudentBehaviors(initialAssigned);
if(behaviorHost)new MutationObserver(()=>drawBehaviors()).observe(behaviorHost,{childList:true});
window.addEventListener('load',()=>{stopLegacyBehaviorKeepalive();drawBehaviors();}, {once:true});
window.addEventListener('message',event=>{
 if(window.parent===window||event.source!==window.parent)return;
 let parentOrigin='';try{parentOrigin=new URL(document.referrer).origin}catch(_){}
 if(!parentOrigin||event.origin!==parentOrigin)return;
 const msg=event.data||{};
 if(msg.type!=='COMPASS_DEMO_V18_CONTEXT'||!Array.isArray(msg.student?.behaviors))return;
 setStudentBehaviors(msg.student.behaviors);
});
window.__COMPASS_FUNCTIONS_V25__={version:'25.1',ready:true,getState:()=>({
 mode:running?'run':'setup',complete,saved,probe:probeMode(),events:backupEvents(),
 total:Array.isArray(plan)?plan.length:0,behaviorCount:document.querySelectorAll('#behaviorItems>.behavior').length
})};
})();