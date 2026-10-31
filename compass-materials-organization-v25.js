(function(){
'use strict';
const C=window.COMPASS_PROGRAM_CONFIG||{};
if((C.program_code||C.code)!=='CP-153-MATERIALS-ORGANIZATION'||window.COMPASS_MATERIALS_V25)return;
const main=document.querySelector('.app .main');
if(!main)throw Error('Materials Organization V25 runner missing');
const $=id=>document.getElementById(id);
const targets=(C.targets||[]).filter(t=>t&&Number.isInteger(Number(t.id))&&Number(t.id)>=1&&Number(t.id)<=40);
const ranges=(C.compass_v25_standard?.benchmarks||[]).map((b,i)=>({
 id:Number(b.id||i+1),name:String(b.label||b.title||'Benchmark '+(i+1)),members:(b.members||[]).map(Number)
}));
if(targets.length!==40||ranges.length!==4||ranges.some(r=>r.members.length!==10)||
   new Set(ranges.flatMap(r=>r.members)).size!==40)
 throw Error('Materials Organization requires 40 original targets and four verified 10-target benchmarks');
const chainList=[['default','Default','T,T,D,T,D,D,T,T'],['momentum','Momentum','T,T,T,T'],['short','Short','T,T,D'],['iep','IEP Chain','T,T,T,T,T'],['alternative','Alternative','T,D,T,D,T,T'],['single','Single','T']];
const root=document.createElement('div');root.id='materialsV25Root';
root.innerHTML=
'<header class="add-head"><div><h1 id="appTitle">Materials Organization</h1><small>COMPASS V25 · Instructional Program</small></div><nav><button id="backBtn" type="button" hidden>← Setup</button><button id="endBtn" type="button">End Session</button></nav></header>'+
'<div class="add-banner" id="storageBanner" role="status">Only authenticated, verified saves are marked complete.</div>'+
'<section class="add-page" id="setupPage"><div class="add-panel add-setup"><div class="add-heading"><h2>Program Setup</h2><span id="selectedPill">Choose a task</span></div><details id="setupFold" open><summary>Program Setup</summary><div class="add-fields" id="addFields"></div>'+
'<div class="add-help" id="probeTargetHelp">Probe Benchmark checks all ten organization tasks once and never counts toward teaching mastery.</div>'+
'<div class="add-preview"><strong id="chainPreviewTitle"></strong><p id="chainPreviewText"></p><div id="chainPreviewSteps"></div></div>'+
'<div class="add-save"><button id="saveSetupBtn" type="button">Save Setup</button><span id="saveSetupStatus" role="status"></span></div></details></div>'+
'<aside class="add-panel add-guide"><details id="instructionsFold" open><summary>Program Instructions</summary><h3>Prepare</h3><p>Choose the benchmark, target and DTI chain. Present real materials with accessible storage, picture lists, or labeled bins matched to the student.</p><h3>Instruction</h3><p>Give a brief natural direction such as “Put the supplies away” or “Get the items on this list.” Respect individualized motor, sensory and communication supports.</p><h3>Scoring</h3><p>Staff observe the action and score Independent Correct, Incorrect or Prompted. Familiar maintenance actions in distractor steps are scored separately.</p><h3>Mastery</h3><p>Require demonstrated independence across distinct instructional dates. Full benchmark probes cover ten targets and never count toward teaching mastery.</p></details><button id="runBtn" type="button" class="add-primary">Run Program →</button></aside></section>'+
'<section class="add-page" id="runPage" hidden><div id="runGrid" class="add-grid"><section class="add-panel material-card"><div class="add-panel-head"><h2>Student Material</h2><button id="imagesOnlyBtn" type="button" aria-pressed="false">▣ Materials Only</button><button id="resetViewBtn" type="button" hidden>Exit Materials Only</button></div><div id="taskStage"></div><div class="add-equation"><div id="sdPrompt">Prepare materials for the organization task</div><div id="materialsAnswers"></div><div id="materialsWorkspace"></div></div><p id="materialsMaterialsNote"></p></section>'+
'<aside class="add-panel score-card"><div class="add-panel-head"><h2>Trial &amp; Scoring</h2><b id="materialsProgress">0 / 0</b></div><div class="add-stat-grid"><div><b id="materialsCorrect">0</b><small>Correct</small></div><div><b id="materialsIncorrect">0</b><small>Incorrect</small></div><div><b id="materialsPrompted">0</b><small>Prompted</small></div></div><p id="materialsAccuracy">No opportunities scored</p><div class="add-score-buttons"><button data-score="correct" type="button">✓ Correct</button><button data-score="incorrect" type="button">✕ Incorrect</button><button data-score="prompted" type="button">⚑ Prompted</button></div><h3>Behavior Tracking</h3><div id="behaviorList"></div><p id="materialsStatus" role="status">Ready</p><button id="saveNextBtn" type="button" class="add-primary" disabled>Save &amp; Next Step</button><button id="nextProgramBtn" type="button" class="add-primary" hidden disabled>Next Program →</button></aside></div></section>';
main.appendChild(root);
document.documentElement.classList.add('materials-v25-active');
const specs=[
 ['benchmarkSelect','Benchmark',[]],['targetSelect','Target',[]],['chainSelect','DTI Chain',chainList.map(x=>[x[0],x[1]+' — '+x[2]])],
 ['skillSelect','Skill Type',[['Application','Application'],['Generalization','Generalization']]],
 ['modeSelect','Teaching Mode',[['Hands-on','Hands-on / real materials'],['Visual Schedule','Visual schedule / AAC support']]],
 ['scoringSelect','Scoring',[['staff','Staff Scored']]],
 ['arraySize','Answer Choices',[['0','N/A — staff observes real materials']]],
 ['distractorSelect','Custom Distractor / Do This',[['wave','Wave'],['clap','Clap'],['tap','Tap the table'],['hands','Hands in lap']]],
 ['goalSelect','IEP Goal',[['','No linked goal']]],
 ['masterySelect','Mastery %',[50,60,70,75,80,85,90,95,100].map(n=>[String(n),n+'%'])],
 ['materialSelect','Materials',[['bins','Labeled bins or organizers'],['folders','Folders and school supplies'],['visual','Visual checklist / AAC'],['adapted','Accessible / adapted organizer']]],
 ['trialsSelect','Trials Per Run',[['1','1 complete DTI chain']]],
 ['masteryTrialsSelect','Trials to Mastery',[['3','3 separate dates'],['4','4 separate dates'],['5','5 separate dates']]],
 ['minOpportunitiesSelect','Min. Opportunities / Day',[['1','1'],['3','3'],['4','4'],['5','5']]],
 ['circuitSelect','Circuit',[['teach','N/A — Teaching'],['probe','Probe Benchmark']]]
];
for(const [id,title,options] of specs){
 const label=document.createElement('label');label.textContent=title;const select=document.createElement('select');select.id=id;
 options.forEach(x=>select.add(new Option(x[1],x[0])));label.appendChild(select);$('addFields').appendChild(label);
}
const opt=(id,items)=>{$(id).replaceChildren();items.forEach(x=>$(id).add(new Option(x[1],x[0])))};
const currRange=()=>ranges[Number($('benchmarkSelect').value)||0]||ranges[0];
const targetFor=n=>targets.find(t=>Number(t.id)===Number(n));
const runtime=()=>window.__COMPASS_STUDENT_RUNTIME__;
const context=()=>runtime()?.context||{};
const state={stage:'setup',plan:[],events:[],idx:0,scored:false,answer:null,probe:false,finished:false,save:'idle',saving:null,started:'',key:'',only:false};
const behaviorCounts={};
const setStatus=s=>{$('materialsStatus').textContent=s};
function preview(){
 const chain=chainList.find(x=>x[0]===$('chainSelect').value)||chainList[0];
 const probe=$('circuitSelect').value==='probe',task=targetFor($('targetSelect').value);
 $('selectedPill').textContent='Benchmark '+currRange().id+' · '+(task?.name||'Target');
 $('chainPreviewTitle').textContent=probe?'Full Benchmark Probe · 10 tasks':'DTI Chain · '+chain[1];
 $('chainPreviewText').textContent=probe?'All 10 tasks once · no teaching mastery credit':'One completed instructional chain · staff observes organization using real materials';
 const steps=probe?Array.from({length:10},()=>'T'):chain[2].split(',');
 $('chainPreviewSteps').replaceChildren();
 steps.forEach((kind,i)=>{const p=document.createElement('span');p.textContent=(i+1)+' · '+kind;$('chainPreviewSteps').appendChild(p)});
 $('probeTargetHelp').hidden=!probe;
 $('skillSelect').value=currRange().id===4?'Generalization':'Application';
}
function syncTargets(){
 const g=currRange(),previous=$('targetSelect').value;
 opt('targetSelect',g.members.map(n=>[String(n),String(n).padStart(2,'0')+' · '+(targetFor(n)?.name||'Target '+n)]));
 if(g.members.includes(Number(previous)))$('targetSelect').value=previous;
 preview();
}
function setup(){
 opt('benchmarkSelect',ranges.map((r,i)=>[String(i),'Benchmark '+r.id+' · '+r.name]));
 const goals=context().iep_goals||context().goals||[];
 goals.forEach((g,i)=>$('goalSelect').add(new Option('IEP Goal '+(g.goal_number||i+1)+' · '+(g.title||g.domain||'Goal'),String(g.id||g.goal_id||''))));
 $('masterySelect').value=String(C.mastery_pct||80);
 syncTargets();
 const saved=context().instance_config?.programSetup||{};
 if(saved.setupBenchmark){const idx=ranges.findIndex(x=>String(x.id)===String(saved.setupBenchmark));if(idx>=0){$('benchmarkSelect').value=String(idx);syncTargets()}}
 const savedMap={targetSelect:'setupTarget',chainSelect:'setupChain',skillSelect:'setupSkillType',scoringSelect:'setupScoring',arraySize:'arraySize',goalSelect:'setupIepGoal',masterySelect:'setupMastery',materialSelect:'materialSelect',modeSelect:'mode',masteryTrialsSelect:'masteryTrialsSelect',minOpportunitiesSelect:'minOpportunitiesSelect',circuitSelect:'circuitSelect',distractorSelect:'customDistractor'};
 for(const [id,key]of Object.entries(savedMap))if(saved[key]!==undefined&&[...$(id).options].some(o=>o.value===String(saved[key])))$(id).value=String(saved[key]);
 for(const [id]of specs)$(id).addEventListener('change',()=>{if(id==='benchmarkSelect')syncTargets();preview()});
 preview();behaviors();
}
function build(){
 const range=currRange(),selected=Number($('targetSelect').value),probe=$('circuitSelect').value==='probe';
 const chain=(chainList.find(x=>x[0]===$('chainSelect').value)||chainList[0])[2].split(',');
 return probe?range.members.map(id=>({type:'T',targetId:id})):
  chain.map(type=>({type,targetId:selected,action:$('distractorSelect').selectedOptions[0]?.textContent||'Wave'}));
}
const step=()=>state.plan[state.idx];
function tally(){
 const t=state.events.filter(x=>x.trial_type==='T');
 const c=t.filter(x=>x.result==='independent_correct').length,i=t.filter(x=>x.result==='incorrect').length,p=t.filter(x=>x.result==='prompted').length;
 $('materialsCorrect').textContent=c;$('materialsIncorrect').textContent=i;$('materialsPrompted').textContent=p;
 $('materialsAccuracy').textContent=t.length?Math.round(100*c/t.length)+'% independent':'No scored target opportunities';
}
function show(){
 const q=step();if(!q)return;
 const t=targetFor(q.targetId);
 $('taskStage').textContent='Step '+(state.idx+1)+' / '+state.plan.length+' · '+(q.type==='D'?'Familiar Distractor / Maintenance':'Organization Target')+' · '+(state.probe?'Benchmark Probe':'Teaching');
 $('sdPrompt').textContent=q.type==='D'?'Do this: '+q.action:(t?.name||'Organize the selected materials');
 $('materialsProgress').textContent=(state.idx+1)+' / '+state.plan.length;
 $('materialsAnswers').replaceChildren();
 $('materialsWorkspace').textContent=q.type==='D'?'Staff: model the familiar action if needed. Score maintenance separately.':
   'Present the actual materials in the selected setting. Observe the learner’s response before prompting.';
 $('materialsMaterialsNote').textContent='Accessible storage and student preferences take priority. Use visual or AAC supports when indicated.';
 root.querySelectorAll('[data-score]').forEach(button=>button.disabled=state.scored);
 $('saveNextBtn').disabled=!state.scored||state.save==='saving';
 $('saveNextBtn').textContent=state.idx===state.plan.length-1?'Save & Finish Run':'Save & Next Step';
 tally();
}
function score(result){
 if(state.stage!=='run'||state.scored||state.finished)return;
 const q=step(),t=targetFor(q?.targetId);if(!q||!t)return;
 state.events.push({trial_number:state.idx+1,trial_type:q.type,result,
  target_name:t.name,target_key:t.key,occurred_at:new Date().toISOString(),
  presented_action:q.type==='D'?q.action:t.name});
 state.scored=true;setStatus('Step '+(state.idx+1)+' scored.');show();
}
function behaviorNames(){
 const c=context(),all=[...(Array.isArray(c.primary_behaviors)?c.primary_behaviors:[]),...(Array.isArray(c.secondary_behaviors)?c.secondary_behaviors:[]),...(Array.isArray(c.behaviors)?c.behaviors:[])];
 return [...new Set(all.map(x=>typeof x==='string'?x:x?.label||x?.name||'').filter(Boolean))].slice(0,8);
}
function behaviors(){
 const box=$('behaviorList');box.replaceChildren();const list=behaviorNames();
 if(!list.length){const n=document.createElement('p');n.textContent='No assigned behaviors for this student.';box.appendChild(n);return}
 list.forEach(name=>{if(behaviorCounts[name]===undefined)behaviorCounts[name]=0;
  const row=document.createElement('div');row.className='add-behavior-row';const label=document.createElement('span');label.textContent=name;
  const minus=document.createElement('button'),count=document.createElement('strong'),plus=document.createElement('button');
  minus.textContent='−';plus.textContent='+';count.textContent=behaviorCounts[name];minus.type=plus.type='button';
  minus.setAttribute('aria-label','Decrease '+name);plus.setAttribute('aria-label','Increase '+name);
  minus.addEventListener('click',()=>{behaviorCounts[name]=Math.max(0,behaviorCounts[name]-1);count.textContent=behaviorCounts[name]});
  plus.addEventListener('click',()=>{behaviorCounts[name]++;count.textContent=behaviorCounts[name]});
  row.append(label,minus,count,plus);box.appendChild(row);
 });
}
function eventMap(e){
 const assigned=context().targets||[];
 const t=assigned.find(x=>String(x.target_name).toLowerCase()===String(e.target_name).toLowerCase());
 if(t)return {...e,target_key:t.target_key||e.target_key};
 // Distractors are review stimuli, not independently assigned acquisition targets.
 // Map the review step to its assigned primary target for the authenticated save bridge,
 // while explicitly retaining the presented sum for historical reporting.
 if(e.trial_type==='D'){
  const primary=assigned.find(x=>String(x.target_name).toLowerCase()==='sum '+$('targetSelect').value);
  if(primary)return {...e,target_name:primary.target_name,target_key:primary.target_key,distractor_target_name:e.target_name};
 }
 return e;
}
function payload(){
 const events=state.events.map(eventMap),target=events.find(x=>x.trial_type==='T')||events[0],t=events.filter(x=>x.trial_type==='T');
 return {program_version:25,program_code:'CP-153-MATERIALS-ORGANIZATION',submission_key:state.key,target_name:target?.target_name,target_key:target?.target_key,
 counts:{independent_correct:t.filter(x=>x.result==='independent_correct').length,incorrect:t.filter(x=>x.result==='incorrect').length,prompted_correct:t.filter(x=>x.result==='prompted').length,no_response:0},
 trial_events:events,behavior_counts:{...behaviorCounts},started_at:state.started,
 v25_run:{benchmark_key:currRange().name,goal_id:$('goalSelect').value||null,probe:state.probe,mode:$('modeSelect').value,mastery_pct:Number($('masterySelect').value),qualifying_dates:Number($('masteryTrialsSelect').value),chain:$('chainSelect').value}};
}
async function finish(){
 if(state.saving)return state.saving;
 const rt=window.__COMPASS_STUDENT_RUNTIME__,data=payload();state.save='saving';
 setStatus('Saving completed run to COMPASS…');$('saveNextBtn').disabled=true;
 state.saving=(async()=>{try{
  let out;
  if(state.probe){
   if(typeof rt?.securePost!=='function')throw Error('Authenticated probe connection unavailable');
   out=await rt.securePost({action:'save_probe',submission_key:state.key,benchmark_key:currRange().name,benchmark_name:'Sums '+currRange().name,events:data.trial_events.map(x=>({trial_number:x.trial_number,target_key:x.target_key,target_name:x.target_name,result:x.result}))});
   if(out?.ok!==true||out?.probe_saved!==true)throw Error('Probe save not confirmed');
  }else{
   if(typeof rt?.saveSession!=='function')throw Error('Authenticated V25 save bridge unavailable');
   out=await rt.saveSession(data);
   if(out?.ok!==true||!out.session_id||Number(out.saved_trial_events)!==data.trial_events.length)throw Error('Incomplete save acknowledgment');
  }
  state.save='saved';state.finished=true;$('saveNextBtn').hidden=true;$('nextProgramBtn').hidden=false;$('nextProgramBtn').disabled=false;
  setStatus(state.probe?'Probe saved separately; no mastery credit.':'All '+data.trial_events.length+' steps saved and confirmed.');
 }catch(err){state.save='failed';state.saving=null;$('saveNextBtn').disabled=false;$('saveNextBtn').textContent='Retry Save';setStatus('Cloud save not confirmed: '+String(err.message||err).slice(0,160))}
 })();return state.saving;
}
function advance(){
 if(!state.scored)return;
 if(state.idx===state.plan.length-1){void finish();return}
 state.idx++;state.answer=null;state.scored=false;show();setStatus('Score the next materials problem.');
}
function run(){
 if(state.stage!=='setup')return;
 if($('modeSelect').value==='Pen & Paper')$('scoringSelect').value='staff';
 const assigned=Array.isArray(context().targets)?context().targets:[];
 if(assigned.length){
  const chosen='sum '+$('targetSelect').value;
  const names=new Set(assigned.map(t=>String(t.target_name||'').trim().toLowerCase()));
  if(!names.has(chosen)&&$('circuitSelect').value!=='probe'){
   $('saveSetupStatus').textContent='Assign this sum target to the student before running.';
   return;
  }
  if($('circuitSelect').value==='probe'&&currRange().members.some(n=>!names.has('sum '+n))){
   $('saveSetupStatus').textContent='To run a complete benchmark probe, assign all five sums to this student.';
   return;
  }
 }
 state.plan=build();if(!state.plan.length||state.plan.length>50)return;
 state.events=[];state.idx=0;state.scored=false;state.finished=false;state.save='idle';state.saving=null;state.answer=null;state.started=new Date().toISOString();state.probe=$('circuitSelect').value==='probe';
 state.key='V25:run-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
 state.stage='run';$('setupPage').hidden=true;$('runPage').hidden=false;$('backBtn').hidden=false;$('saveNextBtn').hidden=false;$('nextProgramBtn').hidden=true;
 $('storageBanner').textContent='COMPASS Materials Organization · '+(state.probe?'Benchmark Probe':'Teaching')+' · cloud confirmation required.';
 behaviors();show();setStatus('Present the problem and score the response.');
}
async function saveSetup(){
 const setup={setupBenchmark:currRange().name,setupTarget:$('targetSelect').value};
 for(const [id]of specs)if(id!=='benchmarkSelect'&&id!=='targetSelect')setup[id]=$(id).value;
 $('saveSetupStatus').textContent='Saving…';
 const rt=runtime();if(typeof rt?.securePost!=='function'){$('saveSetupStatus').textContent='Sign in to save setup to COMPASS.';return}
 try{const response=await rt.securePost({action:'save_setup',setup});if(response?.ok!==true)throw Error('Not confirmed');$('saveSetupStatus').textContent='Setup saved to COMPASS.'}catch(err){$('saveSetupStatus').textContent='Setup not confirmed: '+String(err.message||err).slice(0,100)}
}
function toggleView(on){
 state.only=!!on;root.classList.toggle('add-materials-only',state.only);
 $('imagesOnlyBtn').textContent=state.only?'← Exit Materials Only':'▣ Materials Only';
 $('imagesOnlyBtn').setAttribute('aria-pressed',String(state.only));$('resetViewBtn').hidden=!state.only;
}
$('runBtn').addEventListener('click',run);$('saveSetupBtn').addEventListener('click',saveSetup);$('saveNextBtn').addEventListener('click',advance);
root.querySelectorAll('[data-score]').forEach(b=>b.addEventListener('click',()=>score(b.dataset.score==='correct'?'independent_correct':b.dataset.score==='prompted'?'prompted':'incorrect')));
$('imagesOnlyBtn').addEventListener('click',()=>toggleView(!state.only));$('resetViewBtn').addEventListener('click',()=>toggleView(false));
$('backBtn').addEventListener('click',()=>{if(state.events.length&&state.save!=='saved'){setStatus('Finish or retry saving before returning to Setup.');return}state.stage='setup';$('setupPage').hidden=false;$('runPage').hidden=true;$('backBtn').hidden=true;toggleView(false)});
$('endBtn').addEventListener('click',()=>{if(state.stage==='run'&&state.events.length&&state.save!=='saved'){setStatus('Unsaved data: finish the run before ending.');return}if(typeof window.endSession==='function')window.endSession();setStatus('Session ended.')});
$('nextProgramBtn').addEventListener('click',()=>{if(state.save!=='saved'||window.parent===window)return;let origin=location.origin;try{origin=new URL(document.referrer).origin||origin}catch(_){}window.parent.postMessage({type:'compass-next-program'},origin)});
window.addEventListener('message',ev=>{if(ev.source!==window.parent||window.parent===window)return;let o='';try{o=new URL(document.referrer).origin}catch(_){}if(ev.origin!==o)return;if(ev.data?.type==='COMPASS_DEMO_V18_CONTEXT'&&Array.isArray(ev.data.student?.behaviors)){if(context().assignment_id){context().primary_behaviors=ev.data.student.behaviors;behaviors()}}});
window.COMPASS_MATERIALS_V25={ready:true,version:'25.6',getState:()=>({phase:state.stage,benchmarks:ranges.length,targets:targets.length,steps:state.plan.length,events:state.events.slice(),probe:state.probe,saveStatus:state.save,behaviorCounts:{...behaviorCounts}})};
setup();
})();