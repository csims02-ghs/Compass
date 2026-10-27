/* COMPASS Colors v25 — program-specific adapter; never changes the shared master runner. */
(function(){
"use strict";
const C=window.COMPASS_PROGRAM_CONFIG||{};
if(C.program_code!=="CP-COLORS"||window.__COMPASS_COLORS_V25__)return;
const $=id=>document.getElementById(id);
const main=document.querySelector(".app .main"),setup=document.querySelector(".program-setup"),workspace=$("workspace"),behaviorBar=$("behaviorBar");
if(!main||!setup||!workspace||!behaviorBar||!$("choices")||!workspace.querySelector(".trial-top")||!workspace.querySelector(".response-row"))return;
document.documentElement.classList.add("bp-v25","colors-v25");
const root=document.createElement("div");root.id="bpRoot";
root.innerHTML='<header id="bpHeader"><div><div class="bp-title">Colors <span class="bp-subtitle">· COMPASS Instructional Program</span></div><div class="bp-subtitle" id="bpStepText">Program Setup → Run Program</div></div><nav class="bp-header-actions"><button class="bp-btn" id="bpBack" type="button" hidden>← Setup</button><button class="bp-btn" id="bpEnd" type="button">End Session</button></nav></header>'+
'<section class="bp-page" id="bpPageOne"><div class="bp-panel" id="bpSetupMount"></div><aside class="bp-panel bp-guide" id="bpInstructions"><span class="bp-chip">COLORS · V25</span><h2>Program Instructions</h2><p>Student and behavior assignments are inherited from Student Profile. Select a benchmark, color, skill, DTI chain, array and IEP goal.</p><ol><li><b>Receptive:</b> “Touch [color].” Present a color-swatch array; staff records an independent, prompted or incorrect response.</li><li><b>Expressive:</b> Present one color swatch; ask “What color is this?” and record the verbal, AAC or other agreed communication response.</li><li><b>Matching:</b> Present a model swatch and choices; student selects its color match.</li><li><b>Multi-Select Colors:</b> “Touch all the [color] items.” Select and submit every matching swatch; score the completed selection as one step.</li><li>Mastery requires the configured accuracy on three distinct qualifying instructional dates. Probe data never counts toward teaching mastery.</li></ol><button id="bpRun" type="button" class="bp-btn primary bp-run">Run Program →</button></aside></section>'+
'<section class="bp-page" id="bpPageTwo" hidden><div class="bp-panel" id="bpMaterial"><div class="bp-panel-head"><h2 class="bp-h3">Student Material</h2></div><div id="bpInstruction">Ready</div><div id="bpContext"></div><div id="bpMatchingSample" hidden></div><div id="bpChoicesMount"></div></div><aside class="bp-panel" id="bpScoring"><div class="bp-panel-head"><h2 class="bp-h3">Trial &amp; Scoring</h2><button id="bpImages" type="button" class="bp-btn" aria-pressed="false">▣ Images Only</button></div><div id="bpScoringMount"></div><div id="bpBehaviorMount"></div><div id="bpSaveStatus" role="status">Start the program to collect data.</div><button id="bpSaveNext" type="button" class="bp-btn primary" disabled>Save &amp; Next Step</button><button id="bpNextProgram" type="button" class="bp-btn primary" disabled hidden>Next Program →</button></aside></section>';
main.appendChild(root);
const mount=$("bpSetupMount"),title=document.createElement("h2");title.textContent="Program Setup";title.className="bp-h3";mount.appendChild(title);
const groups=Array.isArray(C.compass_v25_standard?.benchmarks)?C.compass_v25_standard.benchmarks:[{key:"starter",label:"Starter 1–5",members:[1,2,3,4,5]},{key:"core",label:"Core 1–10",members:[1,2,3,4,5,6,7,8,9,10]},{key:"full",label:"Full 1–12",members:Array.from({length:12},(_,i)=>i+1)}];
const topFields=document.createElement("div");topFields.className="colors-top-fields setup-grid";
topFields.innerHTML='<div class="setup-field"><label for="bpBenchmark">Benchmark</label><select id="bpBenchmark"></select></div><div class="setup-field"><label for="bpCircuit">Circuit</label><select id="bpCircuit"><option value="teaching">N/A · Teaching</option><option value="probe">Probe Benchmark</option></select></div><div class="setup-field"><label for="bpMasteryDays">Qualifying days</label><input id="bpMasteryDays" type="number" min="1" max="15" value="3"></div>';
mount.appendChild(topFields);
setup.classList.add("bp-setup");mount.appendChild(setup);$("setupBody").hidden=false;
const instructions=$("colorsProgramInstructions");if(instructions){$("bpInstructions").insertBefore(instructions,$("bpRun"));const body=$("colorsInstructionsBody");if(body)body.hidden=false;}
const benchmark=$("bpBenchmark");groups.forEach((b,i)=>benchmark.add(new Option(b.label||"Benchmark "+(i+1),String(i))));
function selectedGroup(){return groups[Number(benchmark.value)||0]||groups[0];}
function filterTargets(){
 const allowed=new Set((selectedGroup()?.members||[]).map(Number));const select=$("setupTarget"),chosen=select.value;
 const options=(Array.isArray(C.targets)?C.targets:[]).filter(t=>!allowed.size||allowed.has(Number(t.id)));
 select.replaceChildren();options.forEach(x=>select.add(new Option(x.name,x.name)));
 if([...select.options].some(x=>x.value===chosen))select.value=chosen;
 if(typeof updatePreview==="function")updatePreview();
}
benchmark.addEventListener("change",filterTargets);filterTargets();
$("setupScoring").value="staff";
for(const option of [...$("setupSkillType").options])option.hidden=!["Receptive","Expressive","Matching","Multi-Select Colors"].includes(option.value);
if(!["Receptive","Expressive","Matching","Multi-Select Colors"].includes($("setupSkillType").value))$("setupSkillType").value="Receptive";
const choices=$("choices"),top=workspace.querySelector(".trial-top"),response=workspace.querySelector(".response-row");
$("bpChoicesMount").appendChild(choices);$("bpScoringMount").append(top,response);$("bpBehaviorMount").appendChild(behaviorBar);
workspace.hidden=true;workspace.style.display="none";
const status=(message)=>{const node=$("bpSaveStatus");if(node)node.textContent=message;};
let running=false,complete=false,imageOnly=false,syncState="idle",recorded=[],scoredSteps=new Set(),saving=null,lastSelection=null;
let instructionalDate=new Date().toISOString().slice(0,10),startedAt="";
const imgToggle=$("bpImages"),materialHead=$("bpMaterial").querySelector(".bp-panel-head"),scoreHead=$("bpScoring").querySelector(".bp-panel-head");
function setImagesOnly(value){
 imageOnly=!!value;root.classList.toggle("bp-images-only",imageOnly);
 (imageOnly?materialHead:scoreHead).appendChild(imgToggle);
 imgToggle.textContent=imageOnly?"← Exit Images Only":"▣ Images Only";
 imgToggle.setAttribute("aria-pressed",String(imageOnly));
}
imgToggle.addEventListener("click",()=>setImagesOnly(!imageOnly));
function studentColors(){
 return (Array.isArray(C.targets)?C.targets:[]).map(t=>({name:t.name,src:t.image||C.images?.[t.name],hex:t.metadata?.hex||"#ddd"}));
}
const colorLookup=new Map(studentColors().map(x=>[x.name,x]));
const preRenderChoices=typeof renderChoices==="function"?renderChoices:null;
function ownChoice(name){
 const data=colorLookup.get(name),b=document.createElement("button");b.type="button";b.className="choice";b.setAttribute("aria-label","Choose color swatch");
 const card=document.createElement("div");card.className="stimulus-card";
 const frame=document.createElement("div");frame.className="stimulus-frame";
 if(data?.src){const image=document.createElement("img");image.src=data.src;image.alt="Color swatch";image.draggable=false;frame.appendChild(image);}
 else{frame.classList.add("colors-missing-material");frame.textContent="Material unavailable";}
 card.appendChild(frame);b.appendChild(card);
 b.addEventListener("click",()=>{lastSelection=name;if(typeof studentTouch==="function")studentTouch(name);});
 return b;
}
if(preRenderChoices)renderChoices=function(){
 const currentStep=typeof current==="function"?current():null,skill=$("setupSkillType").value;
 if(!currentStep||currentStep.custom||skill==="Multi-Select Colors"){preRenderChoices();return;}
 if(skill==="Expressive"){
  choices.innerHTML="";choices.style.gridTemplateColumns="minmax(0,1fr)";
  choices.appendChild(ownChoice(currentStep.animal));return;
 }
 if(skill==="Receptive"||skill==="Matching"){
  const targetShade=currentStep.animal;
  const pool=studentColors().map(item=>item.name).filter(name=>name!==targetShade);
  const howMany=Math.max(2,Math.min(pool.length+1,Number($("setupArray")?.value)||3));
  const colors=typeof shuffle==="function"?shuffle([targetShade,...shuffle(pool).slice(0,howMany-1)]):[targetShade,...pool.slice(0,howMany-1)];
  choices.replaceChildren();choices.style.gridTemplateColumns="repeat("+Math.min(4,colors.length)+",minmax(0,1fr))";
  colors.forEach(name=>choices.appendChild(ownChoice(name)));
  return;
 }
 preRenderChoices();
};
function syncVisual(){
 if(!running)return;
 const step=typeof current==="function"?current():null,index=typeof trial==="number"?trial+1:1,total=Array.isArray(plan)?plan.length:0;
 const skill=$("setupSkillType").value,shade=step?.animal||target||"color";
 let sd=step?.instruction||"Identify the color.";
 if(skill==="Receptive")sd="Touch "+shade.toLowerCase()+".";
 if(skill==="Expressive")sd="What color is this?";
 if(skill==="Matching")sd="Match the color.";
 if(skill==="Multi-Select Colors")sd="Touch all the "+shade.toLowerCase()+" items.";
 $("bpInstruction").textContent=sd;
 $("bpContext").textContent="Step "+index+" / "+total+" · "+(step?.type==="Distractor"?"Distractor":"Target")+" · "+skill;
 $("bpStepText").textContent="Run Program · Step "+index+" of "+total;
 const sample=$("bpMatchingSample");
 sample.hidden=skill!=="Matching"||!step||!!step.custom;
 if(!sample.hidden){sample.replaceChildren();const color=colorLookup.get(shade);if(color?.src){const img=document.createElement("img");img.src=color.src;img.alt="Match this color swatch";sample.appendChild(img)}}
 choices.style.width="100%";choices.style.maxWidth="none";
 const mult=choices.querySelector(".multi-select-workspace");if(mult){mult.style.width="100%";mult.style.maxWidth="100%";}
}
if(typeof renderAll==="function"){const render=renderAll;renderAll=function(){render();syncVisual()}}
function applied(){return $("bpCircuit").value==="probe";}
function start(){
 const mastery=Number($("setupMastery").value),days=Number($("bpMasteryDays").value);
 if(!Number.isFinite(mastery)||mastery<1||mastery>100){alert("Enter a mastery percentage from 1 through 100.");return}
 if(!Number.isInteger(days)||days<1||days>15){alert("Enter 1–15 distinct mastery days.");return}
 if(!$("setupTarget").value){alert("Choose a target color.");return}
 $("setupScoring").value="staff";
 if(typeof applySetup==="function")applySetup(true);
 // A full benchmark probe tests every target in that benchmark once; it never counts toward teaching mastery.
 if(applied()){
  const allowed=new Set((selectedGroup()?.members||[]).map(Number));
  plan=(Array.isArray(C.targets)?C.targets:[]).filter(t=>!allowed.size||allowed.has(Number(t.id)))
   .map(t=>({type:"Target",animal:t.name,instruction:"Touch "+t.name.toLowerCase()+".",custom:false}));
  trial=0;lastScored=false;tc=ti=tp=dc=di=dp=0;
  if(typeof renderAll==="function")renderAll();
 }
 running=true;complete=false;recorded=[];scoredSteps.clear();syncState="idle";saving=null;startedAt=new Date().toISOString();instructionalDate=startedAt.slice(0,10);
 root.classList.add("bp-running");$("bpPageOne").hidden=true;$("bpPageTwo").hidden=false;$("bpBack").hidden=false;
 $("bpNextProgram").hidden=true;$("bpNextProgram").disabled=true;$("bpSaveNext").hidden=false;$("bpSaveNext").disabled=true;
 status("Score each "+(applied()?"probe":"T/D")+" step. Saved progress will be confirmed by COMPASS.");
 syncVisual();
}
$("bpRun").addEventListener("click",start);
function captureEvents(){
 const group=selectedGroup(),skill=$("setupSkillType").value;
 return recorded.map(x=>{
  const t=C.targets?.find(t=>t.name===x.target);
  return {trial_number:x.step,trial_type:x.type==="Distractor"?"D":"T",
   result:x.result==="correct"?"independent_correct":x.result==="prompted"?"prompted":"incorrect",
   target_name:x.target,target_key:t?.key||null,benchmark_key:group?.key||null,
   goal_id:window.__COMPASS_ACTIVE_GOAL_ID__||null,
   occurred_at:x.time,source:"colors_v25_"+skill.toLowerCase().replace(/\s+/g,"_"),
   skill_type:skill,probe:applied(),instructional_date:instructionalDate};
 });
}
const capture=window.__COMPASS_TRIAL_CAPTURE__||{};
capture.getEvents=captureEvents;window.__COMPASS_TRIAL_CAPTURE__=capture;
async function saveEnd(){
 if(saving)return saving;
 const runtime=window.__COMPASS_STUDENT_RUNTIME__;
 const eventList=captureEvents();
 const meta={program_code:"CP-COLORS",benchmark_key:selectedGroup()?.key||null,skill_type:$("setupSkillType").value,
  trial_events:eventList,behavior_counts:typeof counts==="object"?{...counts}:{},started_at:startedAt,
  instructional_date:instructionalDate,mastery_percentage:Number($("setupMastery").value),mastery_dates_required:Number($("bpMasteryDays").value)};
 syncState="saving";status("All steps scored · saving to COMPASS…");
 saving=(async()=>{
  try{
   if(applied()&&runtime?.securePost){
    const outcome=await runtime.securePost({action:"save_probe",...meta});
    if(!outcome?.ok&&!outcome?.probe_saved)throw Error("Probe not confirmed");
   }else if(runtime?.autoSave){
    const outcome=await runtime.autoSave(applied()?"probe_complete":"program_complete",true);
    if(!outcome?.ok)throw Error("Session save not confirmed");
   }else if(runtime?.saveSession){
    const outcome=await runtime.saveSession({...meta,type:applied()?"probe":"teaching"});
    if(!outcome?.ok)throw Error("Session save not confirmed");
   }else throw Error("No authenticated save bridge");
   syncState="saved";status(applied()?"Benchmark probe saved to COMPASS.":"Session saved to COMPASS.");
   $("bpNextProgram").disabled=false;
  }catch(error){
   syncState="failed";saving=null;status("Cloud save not confirmed. Retry saving before leaving.");
   $("bpNextProgram").disabled=true;
  }
 })();return saving;
}
function onScore(outcome){
 if(!running||complete||typeof lastScored==="undefined"||!lastScored)return;
 const index=Number(trial)||0;if(scoredSteps.has(index))return;
 const step=typeof current==="function"?current():null;
 scoredSteps.add(index);
 recorded.push({step:index+1,type:step?.type||"Target",target:step?.animal||target||"",
   result:outcome,selection:lastSelection,time:new Date().toISOString()});
 const total=Array.isArray(plan)?plan.length:0;
 $("bpSaveNext").disabled=false;
 status("Recorded "+recorded.length+" of "+total+" steps.");
 if(index>=total-1){
  complete=true;$("bpSaveNext").hidden=true;$("bpNextProgram").hidden=false;
  const runtime=window.__COMPASS_STUDENT_RUNTIME__;
  if(runtime?.markProgramComplete)runtime.markProgramComplete();
  void saveEnd();
 }
}
[["correctBtn","correct"],["incorrectBtn","incorrect"],["promptedBtn","prompted"]].forEach(([id,value])=>{
 $(id)?.addEventListener("click",()=>onScore(value));
});
$("bpSaveNext").addEventListener("click",()=>{
 if(!running||complete||!lastScored)return;
 if(typeof nextTrial==="function")nextTrial();
 $("bpSaveNext").disabled=true;
 lastSelection=null;
 syncVisual();
});
// Do not silently discard partial runs.
$("bpBack").addEventListener("click",()=>{
 if(recorded.length&&!complete){status("Finish or save this run before returning to setup.");return;}
 if(complete&&syncState!=="saved"){status("Wait for a confirmed save before leaving.");return;}
 running=false;root.classList.remove("bp-running");$("bpPageTwo").hidden=true;$("bpPageOne").hidden=false;$("bpBack").hidden=true;
 if(imageOnly)setImagesOnly(false);$("bpStepText").textContent="Program Setup → Run Program";
});
$("bpEnd").addEventListener("click",()=>{
 if(recorded.length&&!complete){status("Unfinished run: finish and save your steps before ending.");return;}
 if(complete&&syncState!=="saved"){void saveEnd();return;}
 if(typeof endSession==="function")endSession();
 const runtime=window.__COMPASS_STUDENT_RUNTIME__;if(runtime?.autoSave)void runtime.autoSave("end_session",true);
});
$("bpNextProgram").addEventListener("click",()=>{
 if(!complete||syncState!=="saved"){void saveEnd();return;}
 if(window.parent!==window){
  let targetOrigin=location.origin;try{targetOrigin=new URL(document.referrer).origin||location.origin}catch(_){}
  window.parent.postMessage({type:"compass-next-program"},targetOrigin);
 }
});
const originalSet=typeof setBehaviorDefinitions==="function"?setBehaviorDefinitions:null;
if(originalSet){
 setBehaviorDefinitions=function(list){
  const arr=(Array.isArray(list)?list:[]).filter(Boolean).slice(0,8);
  if(!arr.length){behaviorDefinitions=[];if(typeof renderBehaviorTracking==="function")renderBehaviorTracking();return;}
  return originalSet(arr);
 };
 behaviorDefinitions=[];if(typeof renderBehaviorTracking==="function")renderBehaviorTracking();
 if(Array.isArray(window.__COMPASS_STUDENT_RUNTIME__?.context?.behaviors)){
  setBehaviorDefinitions(window.__COMPASS_STUDENT_RUNTIME__.context.behaviors.map((s,i)=>({key:"color"+i,label:typeof s==="string"?s:s.label||s.name})));
 }
}
window.addEventListener("message",event=>{
 if(window.parent===window||event.source!==window.parent)return;
 // COMPASS student identity remains inherited; never allow arbitrary third-party behavior injection.
 let ref="";try{ref=new URL(document.referrer).origin}catch(_){}
 if(event.origin!==ref)return;
 const payload=event.data||{};
 if(payload.type!=="COMPASS_DEMO_V18_CONTEXT"||!Array.isArray(payload.student?.behaviors))return;
 const labels=[...new Set(payload.student.behaviors.filter(x=>typeof x==="string"&&x.trim()))].slice(0,8);
 setBehaviorDefinitions(labels.map((label,i)=>({key:"color"+i,label})));
});
window.__COMPASS_COLORS_V25__={ready:true,version:"25.5",getState:()=>({
 mode:running?"run":"setup",complete,steps:recorded.length,total:plan?.length||0,
 syncState,probe:applied(),skill:$("setupSkillType").value,events:captureEvents(),behaviorCount:document.querySelectorAll("#behaviorItems>.behavior").length})};
})();
