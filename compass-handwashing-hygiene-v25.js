/* Handwashing and Hygiene v25 — preserve all 65 original scenarios and motor routines. */
(function(){
'use strict';
if(window.COMPASS_HANDWASH_V25||!document.getElementById('setupToggle'))return;
const $=id=>document.getElementById(id);
if(typeof BANK==='undefined'||BANK.length!==65||typeof apply!=='function')throw Error('Handwashing original target bank missing');
const markers='appTitle backBtn resetViewBtn runBtn endBtn nextProgramBtn storageBanner setupPage selectedPill setupFold benchmarkSelect targetSelect probeTargetHelp chainSelect chainPreviewTitle chainPreviewText chainPreviewSteps skillSelect scoringSelect arraySize distractorSelect goalSelect masterySelect materialSelect modeSelect trialsSelect masteryTrialsSelect minOpportunitiesSelect circuitSelect saveSetupStatus saveSetupBtn instructionsFold runPage runGrid sdPrompt taskStage behaviorList saveNextBtn'.split(' ');
const root=document.createElement('div');root.id='hwV25Root';
root.innerHTML='<header class="hv-head"><div><h1 id="appTitle">Handwashing and Hygiene</h1><small>COMPASS V25 · Functional Living</small></div><nav><button id="backBtn" type="button">← Setup</button><button id="endBtn" type="button">End Session</button><button id="nextProgramBtn" type="button" disabled hidden>Next Program →</button></nav></header>'+
 '<p id="storageBanner" role="status">Student program setup · saves are confirmed by COMPASS.</p>'+
 '<section id="setupPage" class="hv-page"><div class="hv-panel"><header><h2>Program Setup</h2><span id="selectedPill"></span></header><div id="setupFold"></div><p id="probeTargetHelp"></p><div class="hv-chain"><strong id="chainPreviewTitle"></strong><p id="chainPreviewText"></p><div id="chainPreviewSteps"></div></div><div class="hv-save-actions"><button id="saveSetupBtn" type="button">Save Setup</button><span id="saveSetupStatus" role="status"></span></div></div><aside class="hv-panel hv-guide"><div id="instructionsFold"></div><button id="runBtn" type="button" class="hv-primary">Run Program →</button></aside></section>'+
 '<section id="runPage" class="hv-page" hidden><div id="runGrid"><div class="hv-panel hv-material"><div class="hv-material-header"><h2>Student Material / Real-Life Practice</h2><button id="imagesOnlyBtn" type="button" aria-pressed="false">▣ Materials Only</button><button id="resetViewBtn" type="button" hidden>Exit Materials Only</button></div><div id="taskStage"></div><div id="sdPrompt"></div><div id="hvWorkspaceMount"></div></div><aside class="hv-panel hv-scoring"><header><h2>Trial &amp; Scoring</h2><span id="hvProgress">0 / 0</span></header><div class="hv-stats"><div>Correct <b id="hvCorrect">0</b></div><div>Incorrect <b id="hvIncorrect">0</b></div><div>Prompted <b id="hvPrompted">0</b></div></div><div id="hvScoreMount"></div><strong>Behavior Tracking</strong><div id="behaviorList"></div><p id="hvSaveStatus" role="status">Score each step.</p><button id="saveNextBtn" type="button" class="hv-primary" disabled>Save &amp; Next Step</button></aside></div></section>';
document.body.appendChild(root);document.documentElement.classList.add('hw-v25-active');
$('setupFold').appendChild(document.querySelector('.setup-panel'));$('instructionsFold').appendChild(document.querySelector('.instructions-panel'));
$('setupBody').hidden=$('instructionsBody').hidden=false;
$('setupToggle').style.display=$('instructionToggle').style.display='none';
function mark(old,id){
 const field=$(old)?.closest('.field');if(!field)throw Error('Missing '+old);
 const wrapper=document.createElement('div');wrapper.id=id;wrapper.className='hv-marker';
 field.parentElement.insertBefore(wrapper,field);wrapper.appendChild(field);
}
for(const [a,b] of [['benchmark','benchmarkSelect'],['target','targetSelect'],['chain','chainSelect'],['skillType','skillSelect'],['scoringMode','scoringSelect'],['distractor','distractorSelect'],['mastery','masterySelect']])mark(a,b);
// Preserve original setupPreview ID: the handwashing benchmark engine updates it.
$('applySetup').closest('.actions').style.display='none';
const x=document.createElement('div');x.className='hv-extra';x.innerHTML=
 '<label id="goalSelect">IEP Goal<select id="hvGoal"><option value="">No linked goal</option></select></label>'+
 '<label id="materialSelect">Materials<select id="hvMaterials"><option value="standard">Soap, comfortable water and clean towel</option><option value="adapted">Adapted accessible washing materials</option><option value="visual">Visual support / AAC</option></select></label>'+
 '<label id="modeSelect">Practice Mode<select id="hvMode"><option value="natural">Natural / staff-scored</option><option value="choices">Recognition choices</option></select></label>'+
 '<label id="trialsSelect">Trials per Run<select id="hvTrials"><option value="1">1 complete DTI chain</option></select></label>'+
 '<label id="masteryTrialsSelect">Mastery Days<select id="hvDays"><option value="3">3 distinct days</option><option value="4">4 distinct days</option><option value="5">5 distinct days</option></select></label>'+
 '<label id="minOpportunitiesSelect">Min. Target Opportunities / Day<select id="hvMinimum"><option value="1">1</option><option value="3">3</option><option value="4" selected>4</option><option value="5">5</option></select></label>'+
 '<label id="circuitSelect">Circuit<select id="hvCircuit"><option value="na">N/A · Teaching</option><option value="probe">Probe Benchmark</option></select></label>';
$('setupBody').appendChild(x);$('iepGoal').closest('.field').style.display='none';
$('hvWorkspaceMount').appendChild($('workspace'));$('workspace').hidden=false;
const scores=$('workspace').querySelector('.scorebar'),notes=$('promptLevel').closest('.grid2');
$('hvScoreMount').append(notes,scores);$('behaviorList').appendChild($('behaviorBar'));
$('sdPrompt').appendChild($('sdBlock'));$('taskStage').append($('trialTag'),$('trialContext'));
$('workspace').querySelector('.statrow').style.display='none';$('nextBtn').style.display='none';
const stat=(id,value)=>{$(id).textContent=String(value)};
let page='setup',complete=false,only=false,saving=null,saveStatus='idle',submission='',selectedGoal='',linkedGoals=[];
const rt=()=>window.__COMPASS_STUDENT_RUNTIME__;
const norm=s=>String(s||'').trim().toLowerCase();
function setupPreview(){
 const b=Number($('benchmark').value),probe=$('chain').value==='CIRCUIT'||$('hvCircuit').value==='probe';
 const steps=probe?Array.from({length:b===1?25:10},()=>'T'):$('chain').value.split(',');
 stat('selectedPill','Benchmark '+b+' · '+(probe?'Probe':'Target '+($('target').selectedOptions[0]?.textContent||'').slice(0,40)));
 stat('chainPreviewTitle',probe?'Probe Benchmark '+b:'DTI Chain');
 stat('chainPreviewText',probe?'Every target once; no teaching mastery credit.':'T = Target · D = Maintenance · one chain per run');
 $('chainPreviewSteps').replaceChildren();
 steps.forEach((s,i)=>{const v=document.createElement('span');v.textContent=(i+1)+' · '+s;$('chainPreviewSteps').appendChild(v)});
 stat('probeTargetHelp',b===1?'25 meaningful “when to wash” scenarios including when washing is NOT needed.':b===2?'10 beginner sequencing targets; optional 2–3 choices.':'10 application targets using real materials and staff scoring; no answer tiles.');
 $('hvMode').value=b>=3?'natural':$('scoringMode').value==='choice'?'choices':'natural';
}
for(const id of ['benchmark','target','chain','scoringMode','arraySize','skillType'])$(id).addEventListener('change',()=>queueMicrotask(setupPreview));
$('hvCircuit').addEventListener('change',()=>{
 $('chain').value=$('hvCircuit').value==='probe'?'CIRCUIT':'T,T,D,T,D,D,T,T';
 syncMode();setupPreview();
});
$('hvMode').addEventListener('change',()=>{
 if(Number($('benchmark').value)>=3){$('hvMode').value='natural';return}
 $('scoringMode').value=$('hvMode').value==='choices'?'choice':'staff';syncMode();setupPreview();
});
function behaviors(list){
 if(!Array.isArray(list))return;
 const names=[...new Set(list.map(x=>typeof x==='string'?x:x?.label||x?.name||'').filter(Boolean))].slice(0,8);
 const old={...state.behaviors};state.behaviors={};
 $('behaviorBar').replaceChildren();
 for(const name of names){
  state.behaviors[name]=old[name]||0;
  const row=document.createElement('div');row.className='behavior';row.dataset.name=name;
  const span=document.createElement('span');span.textContent=name;
  const minus=document.createElement('button'),plus=document.createElement('button'),count=document.createElement('b');
  minus.textContent='−';plus.textContent='+';minus.type=plus.type='button';count.textContent=state.behaviors[name];
  minus.addEventListener('click',()=>{state.behaviors[name]=Math.max(0,state.behaviors[name]-1);count.textContent=state.behaviors[name]});
  plus.addEventListener('click',()=>{state.behaviors[name]++;count.textContent=state.behaviors[name]});
  row.append(span,minus,count,plus);$('behaviorBar').appendChild(row);
 }
}
const initial=rt()?.context;behaviors(initial?.behaviors||initial?.primary_behaviors||[]);
function visible(which){
 page=which;$('setupPage').hidden=which!=='setup';$('runPage').hidden=which!=='run';
 $('backBtn').hidden=which==='setup';$('endBtn').hidden=which==='setup';$('runBtn').hidden=which==='run';
 if(which==='setup'){$('setupBody').hidden=false;$('instructionsBody').hidden=false;}
}
function update(){
 if(page!=='run')return;
 const s=state.score||[],target=state.plan.map((p,i)=>({p,r:s[i]})).filter(x=>x.p.kind==='T'&&x.r.status&&x.r.status!=='na');
 stat('hvProgress',(state.index+1)+' / '+state.plan.length);
 stat('hvCorrect',target.filter(x=>x.r.status==='correct').length);
 stat('hvIncorrect',target.filter(x=>x.r.status==='incorrect').length);
 stat('hvPrompted',target.filter(x=>x.r.status==='prompted').length);
 $('saveNextBtn').disabled=!s[state.index]?.status||saveStatus==='saving';
 $('saveNextBtn').textContent=state.index===state.plan.length-1?'Save & Finish':'Save & Next Step';
}
const originalRender=render;render=function(){originalRender();update()};
const originalScore=score;score=function(response,choice){
 originalScore(response,choice);update();
 if(page==='run'&&state.active&&state.score[state.index]?.status&&state.index===state.plan.length-1){
  setTimeout(()=>{if(state.active&&state.index===state.plan.length-1)next()},90);
 }
};
const originalNext=next;next=function(){originalNext();update()};
const originalFinish=finish;finish=function(){
 if(complete)return;originalFinish();complete=true;saveStatus='saving';
 $('saveNextBtn').disabled=true;stat('hvSaveStatus','Scored complete · saving to COMPASS…');void saveRun();
};
function identity(t,assigned){return assigned.find(x=>norm(x.target_name)===norm(t.name))}
function eventPack(){
 const assigned=rt()?.context?.targets||[],primary=state.plan.find(x=>x.kind==='T');
 const first=identity(primary.target,assigned);
 if(!first)throw Error('Assigned student target not found; cannot save.');
 const events=state.plan.map((step,i)=>{
  const found=step.kind==='T'?identity(step.target,assigned):first,record=state.score[i];
  if(!found)throw Error('Student target assignment missing.');
  return {trial_number:i+1,trial_type:step.kind,target_name:found.target_name,target_key:found.target_key,
   result:record.status==='correct'?'independent_correct':record.status==='prompted'?'prompted':record.status==='na'?'no_response':'incorrect',
   presented_target:step.kind==='D'?step.action:step.target.name,prompt_level:record.prompt||null,
   notes:record.note||null,occurred_at:record.time||new Date().toISOString()};
 });
 return {first,events};
}
async function saveRun(){
 if(saving)return saving;
 saving=(async()=>{
  try{
   const client=rt();if(!client?.context?.assignment_id)throw Error('Open through the student Program Hub.');
   const {first,events}=eventPack(),probe=state.settings.chain==='CIRCUIT';
   if(probe){
    if(typeof client.securePost!=='function')throw Error('Probe save bridge unavailable.');
    const result=await client.securePost({action:'save_probe',submission_key:submission,
      benchmark_key:String(state.settings.benchmark),benchmark_name:'Handwashing Benchmark '+state.settings.benchmark,
      events:events.map(e=>({target_name:e.target_name,target_key:e.target_key,result:e.result}))});
    if(result?.ok!==true||result?.probe_saved!==true)throw Error('Benchmark probe save not confirmed.');
   }else{
    if(typeof client.saveSession!=='function')throw Error('COMPASS session save bridge unavailable.');
    const teaching=events.filter(e=>e.trial_type==='T');
    const result=await client.saveSession({program_version:25,program_code:'CP-132-HANDWASHING-AND-HYGIENE',
      submission_key:submission,target_name:first.target_name,target_key:first.target_key,
      trial_events:events,counts:{independent_correct:teaching.filter(e=>e.result==='independent_correct').length,
        prompted_correct:teaching.filter(e=>e.result==='prompted').length,
        incorrect:teaching.filter(e=>e.result==='incorrect').length,
        no_response:teaching.filter(e=>e.result==='no_response').length},
      behavior_counts:{...state.behaviors},goal_id:selectedGoal||null,
      mastery_percentage:Number($('mastery').value),mastery_dates_required:Number($('hvDays').value),
      v25_run:{benchmark_key:state.settings.benchmark,recognition:state.settings.benchmark===1,source:'handwashing_hygiene_v25'}});
    if(result?.ok!==true||!result?.session_id||Number(result.saved_trial_events)!==events.length)throw Error('Incomplete COMPASS save acknowledgement.');
   }
   saveStatus='saved';stat('hvSaveStatus','Saved to COMPASS · '+events.length+' steps.');$('saveNextBtn').hidden=true;
   $('nextProgramBtn').hidden=false;$('nextProgramBtn').disabled=false;
  }catch(e){saveStatus='failed';saving=null;stat('hvSaveStatus','Not saved: '+String(e.message||e).slice(0,150)+'. Retry Save.');$('saveNextBtn').hidden=false;$('saveNextBtn').disabled=false;$('saveNextBtn').textContent='Retry Save';}
 })();return saving;
}
function run(){
 if($('hvCircuit').value==='probe')$('chain').value='CIRCUIT';
 if(!apply())return;
 complete=false;saveStatus='idle';saving=null;selectedGoal=$('hvGoal').value;
 submission='V25:run-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
 $('nextProgramBtn').hidden=true;$('saveNextBtn').hidden=false;
 behaviors(rt()?.context?.behaviors||rt()?.context?.primary_behaviors||[]);
 visible('run');update();stat('hvSaveStatus','Score every step. Final step saves automatically.');
}
$('runBtn').addEventListener('click',run);
$('saveNextBtn').addEventListener('click',()=>{if(complete&&saveStatus==='failed'){void saveRun();return}if(state.active&&state.score[state.index]?.status)next()});
function imageMode(value){
 only=!!value;root.classList.toggle('hv-only',only);
 $('imagesOnlyBtn').textContent=only?'← Exit Materials Only':'▣ Materials Only';
 $('imagesOnlyBtn').setAttribute('aria-pressed',String(only));
}
$('imagesOnlyBtn').addEventListener('click',()=>imageMode(!only));
$('resetViewBtn').addEventListener('click',()=>imageMode(false));
$('backBtn').addEventListener('click',()=>{if(state.active&&!complete){stat('hvSaveStatus','Finish the scored chain before returning.');return}if(complete&&saveStatus!=='saved'){stat('hvSaveStatus','Confirmed save required.');return}visible('setup');imageMode(false);setupPreview()});
$('endBtn').addEventListener('click',()=>{if(state.active&&!complete){stat('hvSaveStatus','Finish and save the chain.');return}if(complete&&saveStatus!=='saved'){void saveRun();return}visible('setup')});
$('nextProgramBtn').addEventListener('click',()=>{if(saveStatus!=='saved'||window.parent===window)return;let origin=location.origin;try{origin=new URL(document.referrer).origin||origin}catch(e){}window.parent.postMessage({type:'compass-next-program'},origin)});
async function saveSetup(){
 $('saveSetupBtn').disabled=true;stat('saveSetupStatus','Saving…');
 try{
  const client=rt();if(typeof client?.securePost!=='function')throw Error('Open from the signed-in student Program Hub.');
  const s={setupBenchmark:$('benchmark').value,setupTarget:$('target').value,setupChain:$('chain').value,
   setupSkillType:$('skillType').value,setupScoring:$('scoringMode').value,setupMastery:$('mastery').value,
   setupIepGoal:$('hvGoal').value,arraySize:$('arraySize').value,customDistractor:$('distractor').value,
   mode:$('hvMode').value,masteryTrialsSelect:$('hvDays').value,minOpportunitiesSelect:$('hvMinimum').value,
   circuitSelect:$('hvCircuit').value,level:$('waitSec').value};
  const out=await client.securePost({action:'save_setup',setup:s});
  if(out?.ok!==true||out?.saved!==true)throw Error('Save not confirmed.');
  stat('saveSetupStatus','Saved to COMPASS for this student.');
 }catch(err){stat('saveSetupStatus','Not saved: '+String(err.message||err).slice(0,150))}
 finally{$('saveSetupBtn').disabled=false}
}
$('saveSetupBtn').addEventListener('click',saveSetup);
window.addEventListener('message',e=>{
 if(e.source!==window.parent||window.parent===window)return;
 const m=e.data||{};if(m.type!=='COMPASS_DEMO_V18_CONTEXT'||!m.assignment_id)return;
 const choices=Array.isArray(m.linkedGoalOptions)?m.linkedGoalOptions:[],el=$('hvGoal');
 el.replaceChildren(new Option('No linked goal',''));
 choices.forEach(g=>{if(g?.id&&g.title)el.add(new Option(g.title,String(g.id)))});
 behaviors(m.student?.behaviors||[]);
 if(m.programSetup){
  const v=m.programSetup,matches={benchmark:'setupBenchmark',chain:'setupChain',target:'setupTarget',skillType:'setupSkillType',
   scoringMode:'setupScoring',mastery:'setupMastery',arraySize:'arraySize',distractor:'customDistractor'};
  for(const [id,key]of Object.entries(matches)){
   if(v[key]===undefined||id==='target')continue;
   const x=$(id),s=String(v[key]);if(x.tagName!=='SELECT'||[...x.options].some(o=>o.value===s)){x.value=s;x.dispatchEvent(new Event('change',{bubbles:true}))}
  }
  if(v.setupTarget&&[...$('target').options].some(o=>o.value===String(v.setupTarget)))$('target').value=String(v.setupTarget);
  if(v.setupIepGoal)$('hvGoal').value=String(v.setupIepGoal);
  if(v.masteryTrialsSelect)$('hvDays').value=String(v.masteryTrialsSelect);
  if(v.minOpportunitiesSelect)$('hvMinimum').value=String(v.minOpportunitiesSelect);
  if(v.circuitSelect)$('hvCircuit').value=String(v.circuitSelect);
 }
 setupPreview();
});
visible('setup');state.active=false;$('workspace').hidden=false;setupPreview();
const missing=markers.filter(id=>!$(id));if(missing.length)throw Error('V25 marker mismatch: '+missing.join(','));
window.COMPASS_HANDWASH_V25={ready:true,markers:markers.length,getState:()=>({
 page,bench:Number($('benchmark').value),targetCount:BANK.length,total:state.plan.length,
 recorded:state.score.filter(x=>x.status).length,completed:complete,saveStatus,behaviors:Object.keys(state.behaviors).length
})};
})();