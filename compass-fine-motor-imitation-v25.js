(function(){
'use strict';
const CFG=window.COMPASS_PROGRAM_CONFIG||{};
if(CFG.program_code!=='CP-127-FINE-MOTOR-IMITATION'||window.__COMPASS_FMI_V25__)return;
const el=id=>document.getElementById(id), main=document.querySelector('.app .main'),setup=document.querySelector('.program-setup'),work=el('workspace'),beh=el('behaviorBar');
if(!main||!setup||!work||!beh||!el('choices')||!work.querySelector('.trial-top')||!work.querySelector('.response-row'))return;
document.documentElement.classList.add('bp-v25','fmi-v25');
const shell=document.createElement('div');shell.id='bpRoot';
shell.innerHTML='<header id="bpHeader"><div><div class="bp-title">Fine Motor Imitation</div><div class="bp-subtitle" id="bpStepText">Program Setup → Run Program</div></div><nav class="bp-header-actions"><button id="bpBack" type="button" class="bp-btn" hidden>← Setup</button><button id="bpEnd" type="button" class="bp-btn">End Session</button></nav></header>'+
'<section class="bp-page" id="bpPageOne"><div class="bp-panel" id="bpSetupMount"><h2 class="bp-h3">Program Setup</h2></div><aside class="bp-panel bp-guide" id="bpGuide"><span class="bp-chip">FINE MOTOR IMITATION · V25</span><h2>Program Instructions</h2><p>Present a real movement or safe object, model clearly, and say “Do this.” Staff score the observed imitation.</p><ol><li>Choose one of the four benchmarks, a target and DTI chain, or a randomized 10-target Circuit.</li><li>Use accessible materials such as large beads or an adapted pointer as appropriate.</li><li>Wait 3–5 seconds for independent imitation. Apply and fade prompts according to the student plan.</li><li>Do not require painful, unsafe or inaccessible movement patterns.</li><li>Mastery requires the selected accuracy across separate dates. Benchmark probes do not count toward mastery.</li></ol><button id="bpRun" type="button" class="bp-btn primary bp-run">Run Program →</button></aside></section>'+
'<section class="bp-page" id="bpPageTwo" hidden><div class="bp-panel" id="bpMaterial"><div class="bp-panel-head"><h2 class="bp-h3">Student Material / Staff Model</h2></div><div id="bpInstruction">Model the movement. Say “Do this.”</div><div id="bpContext"></div><div id="bpChoicesMount"></div><p id="bpMaterialNote"></p></div><aside class="bp-panel" id="bpScoring"><div class="bp-panel-head"><h2 class="bp-h3">Trial &amp; Scoring</h2><button type="button" class="bp-btn" id="bpImages" aria-pressed="false">▣ Materials Only</button></div><div id="bpScoringMount"></div><div id="bpBehaviorMount"></div><div id="bpSaveStatus" role="status">Run Program to begin.</div><button type="button" id="bpRetrySave" class="bp-btn" hidden>Retry Save</button><button id="bpNextProgram" type="button" class="bp-btn primary" hidden disabled>Next Program →</button></aside></section>';
main.appendChild(shell);
const extras=document.createElement('div');extras.className='fmi-v25-extra setup-grid';extras.innerHTML='<div class="setup-field"><label>Instructional Mode<select id="fmiV25Mode"><option value="teaching">Teaching / Circuit</option><option value="probe">Probe full benchmark</option></select></label></div><div class="setup-field"><label>Mastery · distinct dates<input id="fmiV25Days" type="number" min="1" max="15" value="3"></label></div>';
const setupMount=el('bpSetupMount');setupMount.appendChild(extras);setup.classList.add('bp-setup');setupMount.appendChild(setup);
if(el('setupBody'))el('setupBody').hidden=false;
// The older generic V25 audit inserted a second benchmark selector. Keep the specialist four-benchmark control only.
const duplicateBenchmark=el('compassV251Benchmark');if(duplicateBenchmark){const row=duplicateBenchmark.closest('.setup-field')||duplicateBenchmark.parentElement;if(row)row.hidden=true;duplicateBenchmark.hidden=true;duplicateBenchmark.style.setProperty('display','none','important');duplicateBenchmark.setAttribute('aria-hidden','true');}
const originalInstructions=el('fineMotorInstructions');if(originalInstructions)el('bpGuide').insertBefore(originalInstructions,el('bpRun'));
el('bpChoicesMount').appendChild(el('choices'));el('bpScoringMount').append(work.querySelector('.trial-top'),work.querySelector('.response-row'));el('bpBehaviorMount').appendChild(beh);
work.hidden=true;work.style.display='none';
const say=(id,value)=>{const n=el(id);if(n)n.textContent=String(value??'')};
let mode='setup',presentationOnly=false,completed=false,sync='idle',savePromise=null,events=[],seen=new Set(),runProbe=false,benchmark='',goal='',started='',date='';
const imagesButton=el('bpImages'),modelHead=el('bpMaterial').querySelector('.bp-panel-head'),scoreHead=el('bpScoring').querySelector('.bp-panel-head');
function switchPresentation(on){presentationOnly=!!on;shell.classList.toggle('bp-images-only',presentationOnly);
 (presentationOnly?modelHead:scoreHead).appendChild(imagesButton);
 imagesButton.textContent=presentationOnly?'← Exit Materials Only':'▣ Materials Only';
 imagesButton.setAttribute('aria-pressed',String(presentationOnly));}
imagesButton.addEventListener('click',()=>switchPresentation(!presentationOnly));
function currentItem(){return typeof current==='function'?current():null}
function updateView(){
 if(mode!=='run')return;
 const item=currentItem(),index=typeof trial==='number'?trial+1:1,total=Array.isArray(plan)?plan.length:0;
 const movement=item?.displayName||item?.distractorLabel||item?.fineMotorTarget?.metadata?.base_target||item?.animal||'the movement';
 say('bpInstruction','Model the movement. Say “Do this.”');
 say('bpContext','Step '+index+' / '+total+' · '+(item?.type||'Target')+' · '+(runProbe?'Benchmark Probe':'Teaching'));
 say('bpStepText','Run Program · Step '+index+' of '+total);
 say('bpMaterialNote','Staff models: '+movement+'. Use accessible real materials and observe the response before prompting.');
}
if(typeof renderAll==='function'){const old=renderAll;renderAll=function(){old();updateView()};}
const capture=window.__COMPASS_TRIAL_CAPTURE__||{};
function captured(){return events.map(e=>({trial_number:e.step,trial_type:e.type==='Distractor'?'D':'T',result:e.result==='correct'?'independent_correct':e.result==='prompted'?'prompted':'incorrect',target_name:e.name,target_key:e.key||null,benchmark_key:benchmark,goal_id:goal||null,occurred_at:e.at,source:'fine_motor_imitation_v25_step',instructional_date:date,probe:runProbe,skill_type:'Imitation'}))}
capture.getEvents=captured;window.__COMPASS_TRIAL_CAPTURE__=capture;
function benchNumber(){return Number(window.COMPASS_FINE_MOTOR_IMITATION?.getBenchmark?.()||1)}
function start(){
 const mastery=Number(el('setupMastery').value),days=Number(el('fmiV25Days').value);
 if(!Number.isFinite(mastery)||mastery<1||mastery>100){alert('Mastery must be between 1% and 100%.');return}
 if(!Number.isInteger(days)||days<1||days>15){alert('Enter 1 to 15 qualifying dates.');return}
 if(typeof applySetup!=='function')return;
 el('setupScoring').value='staff';applySetup(true);
 const bench=benchNumber();benchmark='FMIM-B'+bench;goal=el('setupIepGoal')?.value||window.__COMPASS_ACTIVE_GOAL_ID__||'';
 runProbe=el('fmiV25Mode').value==='probe';
 if(runProbe){
  const selected=(Array.isArray(CFG.targets)?CFG.targets:[]).filter(t=>Number(t.metadata?.benchmark_number||t.metadata?.benchmark)===bench);
  if(selected.length!==10){alert('Selected benchmark must contain 10 verified targets.');return}
  plan=selected.map(t=>({type:'Target',animal:t.name,displayName:t.metadata?.base_target||t.name,fineMotorTarget:t,instruction:'Model: '+(t.metadata?.base_target||t.name)+'. Then say “Do this.”',custom:false,benchmark:bench,circuit:true}));
  trial=0;lastScored=false;tc=ti=tp=dc=di=dp=0;if(typeof renderAll==='function')renderAll();
 }
 if(!Array.isArray(plan)||!plan.length){alert('No programmed trials found.');return}
 if(plan.some(x=>x.unavailable)){alert('Mastered distractor is unavailable. Choose a different distractor.');return}
 events=[];seen.clear();completed=false;sync='idle';savePromise=null;started=new Date().toISOString();date=started.slice(0,10);
 mode='run';shell.classList.add('bp-running');el('bpPageOne').hidden=true;el('bpPageTwo').hidden=false;el('bpBack').hidden=false;
 el('bpNextProgram').hidden=true;el('bpNextProgram').disabled=true;el('bpRetrySave').hidden=true;
 say('bpSaveStatus',runProbe?'Probe: no mastery credit from this run.':'Each teaching date qualifies only once for mastery.');
 updateView();
}
el('bpRun').addEventListener('click',start);
function service(){return window.__COMPASS_STUDENT_RUNTIME__}
async function saveRun(){
 if(savePromise)return savePromise;
 const rt=service(),payload={program_code:CFG.program_code,trial_events:captured(),benchmark_key:benchmark,goal_id:goal||null,started_at:started,instructional_date:date,mastery_percentage:Number(el('setupMastery').value),mastery_dates_required:Number(el('fmiV25Days').value),behavior_counts:typeof counts==='object'?{...counts}:{}};
 sync='saving';say('bpSaveStatus','Final step scored · saving to COMPASS…');el('bpRetrySave').hidden=true;
 savePromise=(async()=>{
  try{
   let result;
   if(runProbe&&rt?.securePost){result=await rt.securePost({action:'save_probe',...payload});if(result?.ok!==true&&result?.probe_saved!==true)throw Error('Probe save not confirmed')}
   else if(rt?.autoSave){result=await rt.autoSave(runProbe?'probe_complete':'program_complete',true);if(result?.ok!==true)throw Error('Save not confirmed')}
   else if(rt?.saveSession){result=await rt.saveSession({...payload,type:runProbe?'probe':'teaching'});if(result?.ok!==true)throw Error('Save not confirmed')}
   else throw Error('Authenticated runtime unavailable');
   sync='saved';say('bpSaveStatus',runProbe?'Probe saved; excluded from teaching mastery.':'Session saved to COMPASS.');
   el('bpNextProgram').hidden=false;el('bpNextProgram').disabled=false;
  }catch(e){sync='failed';savePromise=null;say('bpSaveStatus','Cloud save not confirmed. Retry before leaving.');el('bpRetrySave').hidden=false;}
 })();return savePromise;
}
el('bpRetrySave').addEventListener('click',()=>{if(completed)void saveRun()});
function scored(result){
 if(mode!=='run'||completed||!lastScored)return;
 const index=Number(trial)||0;if(seen.has(index))return;
 const item=currentItem();if(!item)return;seen.add(index);
 const targetInfo=(Array.isArray(CFG.targets)?CFG.targets:[]).find(t=>t.name===item.animal);
 events.push({step:index+1,type:item.type,name:item.animal||item.displayName||'',key:targetInfo?.key||null,result,at:new Date().toISOString()});
 say('bpSaveStatus','Scored '+events.length+' / '+plan.length+' steps.');
 if(index===plan.length-1){
  completed=true;const rt=service();if(!runProbe&&typeof rt?.markProgramComplete==='function')rt.markProgramComplete();
  void saveRun();return;
 }
 const previous=index;
 setTimeout(()=>{if(mode==='run'&&!completed&&lastScored&&trial===previous&&typeof nextTrial==='function')nextTrial()},120);
}
for(const [id,value] of [['correctBtn','correct'],['incorrectBtn','incorrect'],['promptedBtn','prompted']])el(id)?.addEventListener('click',()=>scored(value));
el('bpBack').addEventListener('click',()=>{
 if(events.length&&!completed){say('bpSaveStatus','Complete the run before returning to Setup.');return}
 if(completed&&sync!=='saved'){say('bpSaveStatus','A confirmed save is required before leaving.');return}
 mode='setup';shell.classList.remove('bp-running');el('bpPageTwo').hidden=true;el('bpPageOne').hidden=false;el('bpBack').hidden=true;if(presentationOnly)switchPresentation(false);say('bpStepText','Program Setup → Run Program');
});
el('bpEnd').addEventListener('click',()=>{
 if(events.length&&!completed){say('bpSaveStatus','Complete the run before ending the session.');return}
 if(completed&&sync!=='saved'){void saveRun();return}
 if(typeof endSession==='function')endSession();if(service()?.autoSave)void service().autoSave('end_session',true);
});
el('bpNextProgram').addEventListener('click',()=>{
 if(!completed||sync!=='saved'||window.parent===window)return;
 let origin=location.origin;try{origin=new URL(document.referrer).origin||origin}catch(e){}
 window.parent.postMessage({type:'compass-next-program'},origin);
});
if(typeof setBehaviorDefinitions==='function'){
 const orig=setBehaviorDefinitions;
 setBehaviorDefinitions=function(input){
  const a=(Array.isArray(input)?input:[]).filter(Boolean).slice(0,8).map((x,i)=>typeof x==='string'?{key:'fmi'+i,label:x}:x);
  if(!a.length){behaviorDefinitions=[];renderBehaviorTracking();return}
  return orig(a);
 };
 behaviorDefinitions=[];renderBehaviorTracking();
 const context=service()?.context||{};
 const labels=[...(Array.isArray(context.primary_behaviors)?context.primary_behaviors:[]),...(Array.isArray(context.secondary_behaviors)?context.secondary_behaviors:[]),...(Array.isArray(context.behaviors)?context.behaviors:[])];
 if(labels.length)setBehaviorDefinitions(labels);
}
window.addEventListener('message',e=>{
 if(e.source!==window.parent||window.parent===window)return;
 let valid='';try{valid=new URL(document.referrer).origin}catch(_){}
 if(!valid||e.origin!==valid)return;
 if(e.data?.type==='COMPASS_DEMO_V18_CONTEXT'&&Array.isArray(e.data.student?.behaviors)&&typeof setBehaviorDefinitions==='function'){
  const a=[...new Set(e.data.student.behaviors.filter(x=>typeof x==='string'&&x.trim()))].slice(0,8);
  setBehaviorDefinitions(a.map((x,i)=>({key:'fmi'+i,label:x})));
 }
});
window.__COMPASS_FMI_V25__={version:'25.5',ready:true,getState:()=>({mode,completed,total:Array.isArray(plan)?plan.length:0,steps:events.length,probe:runProbe,saveState:sync,events:captured(),behaviors:document.querySelectorAll('#behaviorItems .behavior').length})};
})();