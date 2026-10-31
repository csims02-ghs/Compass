(function(){
'use strict';
const C=window.COMPASS_PROGRAM_CONFIG||{};
if((C.program_code||C.code)!=='CP-ADDITION'||window.COMPASS_ADDITION_V25)return;
const main=document.querySelector('.app .main');
if(!main)throw Error('Addition V25 runner missing');
const $=id=>document.getElementById(id);
const targets=(C.targets||[]).filter(t=>t&&Number(t.metadata?.answer??t.id)>0);
const ranges=(C.compass_v25_standard?.benchmarks||[]).map((b,i)=>({name:String(b.range||b.label||'1-5'),members:(b.members||[]).map(Number)}));
if(targets.length!==100||ranges.length!==20||ranges.some(r=>r.members.length!==5))throw Error('Addition 100-target benchmark integrity failure');
const chainList=[['default','Default','T,T,D,T,D,D,T,T'],['momentum','Momentum','T,T,T,T'],['short','Short','T,T,D'],['iep','IEP Chain','T,T,T,T,T'],['alternative','Alternative','T,D,T,D,T,T'],['single','Single','T']];
const root=document.createElement('div');root.id='additionV25Root';
root.innerHTML=
'<header class="add-head"><div><h1 id="appTitle">Addition</h1><small>COMPASS V25 · Instructional Program</small></div><nav><button id="backBtn" type="button" hidden>← Setup</button><button id="endBtn" type="button">End Session</button></nav></header>'+
'<div class="add-banner" id="storageBanner" role="status">Only authenticated, verified saves are marked complete.</div>'+
'<section class="add-page" id="setupPage"><div class="add-panel add-setup"><div class="add-heading"><h2>Program Setup</h2><span id="selectedPill">Select target</span></div><details id="setupFold" open><summary>Program Setup</summary><div class="add-fields" id="addFields"></div>'+
'<div class="add-help" id="probeTargetHelp">Probe Benchmark presents all five target sums once and does not count toward teaching mastery.</div>'+
'<div class="add-preview"><strong id="chainPreviewTitle"></strong><p id="chainPreviewText"></p><div id="chainPreviewSteps"></div></div>'+
'<div class="add-save"><button id="saveSetupBtn" type="button">Save Setup</button><span id="saveSetupStatus" role="status"></span></div></details></div>'+
'<aside class="add-panel add-guide"><details id="instructionsFold" open><summary>Program Instructions</summary><h3>Readiness</h3><p>Choose the benchmark, target, and chain. Student and IEP data come from Student Profile.</p><h3>Instruction</h3><p>Present the addition problem and say “Solve this addition problem.” Use counters or paper when appropriate; fade prompts.</p><h3>Scoring</h3><p>Staff may score Correct, Incorrect, or Prompted. On-screen answer choices can be N/A, 3, 4, or 5. Pen & Paper is staff-scored.</p><h3>Mastery</h3><p>Three distinct instructional days are required. Benchmark probes are stored separately from teaching mastery.</p></details><button id="runBtn" type="button" class="add-primary">Run Program →</button></aside></section>'+
'<section class="add-page" id="runPage" hidden><div id="runGrid" class="add-grid"><section class="add-panel material-card"><div class="add-panel-head"><h2>Student Material</h2><button id="imagesOnlyBtn" type="button" aria-pressed="false">▣ Materials Only</button><button id="resetViewBtn" type="button" hidden>Exit Materials Only</button></div><div id="taskStage"></div><div class="add-equation"><div id="sdPrompt">0 + 0 = ?</div><div id="additionAnswers"></div><div id="additionWorkspace"></div></div><p id="additionMaterialsNote"></p></section>'+
'<aside class="add-panel score-card"><div class="add-panel-head"><h2>Trial &amp; Scoring</h2><b id="additionProgress">0 / 0</b></div><div class="add-stat-grid"><div><b id="additionCorrect">0</b><small>Correct</small></div><div><b id="additionIncorrect">0</b><small>Incorrect</small></div><div><b id="additionPrompted">0</b><small>Prompted</small></div></div><p id="additionAccuracy">No opportunities scored</p><div class="add-score-buttons"><button data-score="correct" type="button">✓ Correct</button><button data-score="incorrect" type="button">✕ Incorrect</button><button data-score="prompted" type="button">⚑ Prompted</button></div><h3>Behavior Tracking</h3><div id="behaviorList"></div><p id="additionStatus" role="status">Ready</p><button id="saveNextBtn" type="button" class="add-primary" disabled>Save &amp; Next Step</button><button id="nextProgramBtn" type="button" class="add-primary" hidden disabled>Next Program →</button></aside></div></section>';
main.appendChild(root);
document.documentElement.classList.add('addition-v25-active');
const specs=[
 ['benchmarkSelect','Benchmark',[]],['targetSelect','Target',[]],['chainSelect','DTI Chain',chainList.map(x=>[x[0],x[1]+' — '+x[2]])],
 ['skillSelect','Skill Type',[['Academic','Academic'],['Pre-Academic','Pre-Academic']]],
 ['modeSelect','Response Mode',[['On Screen','On Screen'],['Pen & Paper','Pen & Paper']]],
 ['scoringSelect','Scoring',[['staff','Staff Scored'],['device','Device Scored']]],
 ['arraySize','Answer Choices',[['0','N/A — No choices'],['3','3 choices'],['4','4 choices'],['5','5 choices']]],
 ['distractorSelect','Distractor',[['na','N/A — Other sums in benchmark'],['review','Review other mastered sums']]],
 ['goalSelect','IEP Goal',[['','No linked goal']]],
 ['masterySelect','Mastery %',[50,60,70,75,80,85,90,95,100].map(x=>[String(x),x+'%'])],
 ['materialSelect','Materials',[['equation','On-screen number equation'],['counters','Counters / number tiles'],['paper','Paper / pencil']]],
 ['trialsSelect','Problems Per Run',(C.problem_totals||[5,8,10,12,15,20,25]).map(x=>[String(x),x+' problems'])],
 ['masteryTrialsSelect','Trials to Mastery',[['3','3 separate days'],['4','4 separate days'],['5','5 separate days']]],
 ['minOpportunitiesSelect','Trials Per Run',[['1','1 completed chain']]],
 ['circuitSelect','Circuit',[['teach','N/A — Teaching'],['probe','Probe Benchmark']]]
];
for(const [id,title,options] of specs){
 const label=document.createElement('label');label.textContent=title;const select=document.createElement('select');select.id=id;
 options.forEach(x=>select.add(new Option(x[1],x[0])));label.appendChild(select);$('addFields').appendChild(label);
}
const opt=(id,items)=>{$(id).replaceChildren();items.forEach(x=>$(id).add(new Option(x[1],x[0])))};
const currRange=()=>ranges[Number($('benchmarkSelect').value)||0]||ranges[0];
const targetFor=n=>targets.find(t=>Number(t.metadata?.answer??t.id)===Number(n));
const runtime=()=>window.__COMPASS_STUDENT_RUNTIME__;
const context=()=>runtime()?.context||{};
const state={stage:'setup',plan:[],events:[],idx:0,scored:false,answer:null,probe:false,finished:false,save:'idle',saving:null,started:'',key:'',only:false};
const behaviorCounts={};
const setStatus=s=>{$('additionStatus').textContent=s};
function preview(){
 const chain=chainList.find(x=>x[0]===$('chainSelect').value)||chainList[0],isProbe=$('circuitSelect').value==='probe';
 $('selectedPill').textContent='Sum '+$('targetSelect').value+' · '+currRange().name;
 $('chainPreviewTitle').textContent=isProbe?'Benchmark Probe · 5 sums':chain[1]+' · DTI Chain';
 $('chainPreviewText').textContent=isProbe?'Five sums, each presented once. No teaching mastery credit.':$('trialsSelect').value+' addition problems · '+$('modeSelect').value+' · one completed chain per run';
 $('chainPreviewSteps').replaceChildren();
 (isProbe?['T','T','T','T','T']:chain[2].split(',')).forEach((v,i)=>{const s=document.createElement('span');s.textContent=(i+1)+' · '+v;$('chainPreviewSteps').appendChild(s)});
 $('probeTargetHelp').hidden=!isProbe;
 $('scoringSelect').disabled=$('modeSelect').value==='Pen & Paper';
 $('arraySize').disabled=$('modeSelect').value==='Pen & Paper';
}
function syncTargets(){
 const previous=$('targetSelect').value;
 opt('targetSelect',currRange().members.map(n=>[String(n),'Sum '+n]));
 if(currRange().members.includes(Number(previous)))$('targetSelect').value=previous;
 preview();
}
function setup(){
 opt('benchmarkSelect',ranges.map((r,i)=>[String(i),'Benchmark '+(i+1)+' · Sums '+r.name]));
 const goals=context().iep_goals||context().goals||[];
 goals.forEach((g,i)=>$('goalSelect').add(new Option('IEP Goal '+(g.goal_number||i+1)+' · '+(g.title||g.domain||'Goal'),String(g.id||g.goal_id||''))));
 $('masterySelect').value=String(C.mastery_pct||80);
 $('trialsSelect').value=String(C.default_problem_total||5);
 $('modeSelect').value=C.default_response_mode||'On Screen';
 $('scoringSelect').value=C.scoring_mode==='device'?'device':'staff';
 $('arraySize').value=String(C.default_answer_choices??0);
 syncTargets();
 const saved=context().instance_config?.programSetup||{};
 const keys={targetSelect:'setupTarget',chainSelect:'chainSelect',skillSelect:'skillSelect',modeSelect:'modeSelect',scoringSelect:'scoringSelect',arraySize:'arraySize',goalSelect:'goalSelect',masterySelect:'masterySelect',materialSelect:'materialSelect',trialsSelect:'trialsSelect',masteryTrialsSelect:'masteryTrialsSelect',circuitSelect:'circuitSelect'};
 if(saved.setupBenchmark){const i=ranges.findIndex(x=>x.name===saved.setupBenchmark);if(i>=0){$('benchmarkSelect').value=String(i);syncTargets()}}
 for(const [id,key]of Object.entries(keys)){if(saved[key]!==undefined&&[...$(id).options].some(x=>x.value===String(saved[key])))$(id).value=String(saved[key])}
 for(const [id]of specs)$(id).addEventListener('change',()=>{if(id==='benchmarkSelect')syncTargets();if(id==='modeSelect'&&$('modeSelect').value==='Pen & Paper')$('scoringSelect').value='staff';preview()});
 preview();behaviors();
}
function parameters(n,index){
 const stored=targetFor(n)?.metadata?.example_variations?.filter(x=>Array.isArray(x)&&x.length===2&&Number(x[0])+Number(x[1])===n)||[];
 if(stored.length)return stored[index%stored.length].map(Number);
 const a=Math.floor(n/2);return index%2?[n-a,a]:[a,n-a];
}
function build(){
 const g=currRange(),selected=Number($('targetSelect').value),probe=$('circuitSelect').value==='probe';
 const chain=(chainList.find(c=>c[0]===$('chainSelect').value)||chainList[0])[2].split(',');
 const count=Number($('trialsSelect').value)||5;
 const src=probe?g.members.map(n=>({sum:n,type:'T'})):Array.from({length:count},(_,i)=>{
  const type=chain[i%chain.length],others=g.members.filter(n=>n!==selected);
  return{type,sum:type==='D'?others[i%others.length]:selected};
 });
 return src.map((x,i)=>({...x,parts:parameters(x.sum,i)}));
}
function options(sum,index){
 const n=Number($('arraySize').value)||0;if(n<1||$('modeSelect').value!=='On Screen')return [];
 const list=[sum];for(let distance=1;list.length<n&&distance<=100;distance++)for(const x of [sum-distance,sum+distance])if(x>=0&&x<=100&&!list.includes(x)&&list.length<n)list.push(x);
 for(let i=list.length-1;i>0;i--){const j=(i*17+index*11)%(i+1);[list[i],list[j]]=[list[j],list[i]]}
 return list;
}
const step=()=>state.plan[state.idx];
function tally(){
 const t=state.events.filter(x=>x.trial_type==='T');
 const c=t.filter(x=>x.result==='independent_correct').length,i=t.filter(x=>x.result==='incorrect').length,p=t.filter(x=>x.result==='prompted').length;
 $('additionCorrect').textContent=c;$('additionIncorrect').textContent=i;$('additionPrompted').textContent=p;
 $('additionAccuracy').textContent=t.length?Math.round(100*c/t.length)+'% independent':'No scored target opportunities';
}
function show(){
 const q=step();if(!q)return;
 $('taskStage').textContent='Step '+(state.idx+1)+' / '+state.plan.length+' · '+(q.type==='T'?'Target':'Distractor Review')+' · '+(state.probe?'Probe':'Teaching');
 $('sdPrompt').textContent=q.parts[0]+' + '+q.parts[1]+' = ?';
 $('additionProgress').textContent=(state.idx+1)+' / '+state.plan.length;
 $('additionAnswers').replaceChildren();
 for(const n of options(q.sum,state.idx)){
  const b=document.createElement('button');b.type='button';b.textContent=n;b.className='add-answer';b.disabled=state.scored;
  b.setAttribute('aria-pressed',String(n===state.answer));
  b.addEventListener('click',()=>{if(state.scored)return;state.answer=n;[...$('additionAnswers').children].forEach(x=>x.setAttribute('aria-pressed',String(Number(x.textContent)===n)));if($('scoringSelect').value==='device')score(n===q.sum?'independent_correct':'incorrect')});
  $('additionAnswers').appendChild(b);
 }
 $('additionWorkspace').textContent=$('additionAnswers').childElementCount?'Select an answer; staff can also score a prompted response.':'Staff observes the response and records the score.';
 $('additionMaterialsNote').textContent=$('modeSelect').value==='Pen & Paper'?'Staff: present and observe the written answer.':$('materialSelect').value==='counters'?'Staff: provide actual accessible counters or number tiles.':'Show the equation; use the student’s approved supports.';
 root.querySelectorAll('[data-score]').forEach(b=>b.disabled=state.scored);
 $('saveNextBtn').disabled=!state.scored||state.save==='saving';
 $('saveNextBtn').textContent=state.idx===state.plan.length-1?'Save & Finish Run':'Save & Next Step';
 tally();
}
function score(result){
 if(state.stage!=='run'||state.scored||state.finished)return;
 const q=step(),t=targetFor(q.sum);if(!q||!t)return;
 state.events.push({trial_number:state.idx+1,trial_type:q.type,result,target_name:t.name,target_key:t.key,occurred_at:new Date().toISOString(),problem:q.parts.join(' + '),expected_sum:q.sum,selected_answer:state.answer});
 state.scored=true;setStatus('Step '+(state.idx+1)+' recorded.');show();
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
 const t=(context().targets||[]).find(x=>String(x.target_name).toLowerCase()===String(e.target_name).toLowerCase());
 return {...e,target_key:t?.target_key||e.target_key};
}
function payload(){
 const events=state.events.map(eventMap),target=events.find(x=>x.trial_type==='T')||events[0],t=events.filter(x=>x.trial_type==='T');
 return {program_version:25,program_code:'CP-ADDITION',submission_key:state.key,target_name:target?.target_name,target_key:target?.target_key,
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
 state.idx++;state.answer=null;state.scored=false;show();setStatus('Score the next addition problem.');
}
function run(){
 if(state.stage!=='setup')return;
 if($('modeSelect').value==='Pen & Paper')$('scoringSelect').value='staff';
 state.plan=build();if(!state.plan.length||state.plan.length>50)return;
 state.events=[];state.idx=0;state.scored=false;state.finished=false;state.save='idle';state.saving=null;state.answer=null;state.started=new Date().toISOString();state.probe=$('circuitSelect').value==='probe';
 state.key='V25:run-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
 state.stage='run';$('setupPage').hidden=true;$('runPage').hidden=false;$('backBtn').hidden=false;$('saveNextBtn').hidden=false;$('nextProgramBtn').hidden=true;
 $('storageBanner').textContent='COMPASS Addition · '+(state.probe?'Benchmark Probe':'Teaching')+' · cloud confirmation required.';
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
window.COMPASS_ADDITION_V25={ready:true,version:'25.6',getState:()=>({phase:state.stage,benchmarks:ranges.length,targets:targets.length,steps:state.plan.length,events:state.events.slice(),probe:state.probe,saveStatus:state.save,behaviorCounts:{...behaviorCounts}})};
setup();
})();