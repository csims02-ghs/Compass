/* COMPASS Gross Motor Imitation — V25.5 two-page adapter. Scoped to CP-126. */
(function(){
"use strict";
const C=window.COMPASS_PROGRAM_CONFIG||window.CONFIG||{};
const CODE="CP-126-GROSS-MOTOR-IMITATION";
if(C.program_code!==CODE||window.__COMPASS_GMI_V25__)return;
const $=id=>document.getElementById(id);
const main=document.querySelector(".app .main"),setup=document.querySelector(".program-setup");
const workspace=$("workspace"),behaviors=$("behaviorBar"),choices=$("choices");
const chain=$("setupChain"),targetSel=$("setupTarget"),benchmarkSel=$("setupFineMotorBenchmark");
if(!main||!setup||!workspace||!behaviors||!choices||!chain||!targetSel||!benchmarkSel||
   typeof window.staffScore!=="function"||typeof window.applySetup!=="function"){
  console.error("Gross Motor V25 required runner controls missing");return;
}
const targets=Array.isArray(C.targets)?C.targets:[],benchmarks=Array.isArray(C.benchmark_sets)?C.benchmark_sets:[];
if(targets.length!==50||benchmarks.length!==5){
  console.error("Gross Motor target registry not ready for V25",targets.length,benchmarks.length);return;
}
window.__COMPASS_GMI_V25__={ready:false,version:"25.5"};
document.documentElement.classList.add("gmi-v25");
const root=document.createElement("div");root.id="gmiV25";
root.innerHTML=
'<header id="gmHeader"><div><h1>Gross Motor Imitation</h1><span id="gmStep">Program Setup → Run Program</span></div><nav><button type="button" id="gmBack" class="gm-btn" hidden>← Setup</button><button type="button" id="gmEnd" class="gm-btn">End Session</button></nav></header>'+
'<section id="gmPageOne" class="gm-page"><div class="gm-panel" id="gmSetup"><h2>Program Setup</h2><div id="gmAddedControls" class="gm-add-grid"><div><label for="gmCircuit">Circuit</label><select id="gmCircuit"><option value="teaching">N/A · Teaching</option><option value="circuit">Randomized Benchmark Circuit</option><option value="probe">Probe Benchmark · Independent Only</option></select></div><div><label for="gmDays">Mastery qualifying days</label><input id="gmDays" type="number" min="1" max="15" value="3"></div><div><label for="gmRuns">Trials per Run</label><select id="gmRuns"><option value="1">1 DTI chain / run</option></select></div></div></div><aside class="gm-panel gm-guide"><div class="gm-label">COMPASS · GROSS MOTOR V25</div><h2>Program Instructions</h2><p>Student identity and assigned behaviors are inherited from Student Profile. No student selection is needed here.</p><button type="button" id="gmStart" class="gm-btn gm-primary">Run Program →</button></aside></section>'+
'<section id="gmPageTwo" class="gm-page" hidden><div class="gm-panel" id="gmMaterial"><div class="gm-line"><h2>Student Instruction</h2><button id="gmMaterialsOnly" type="button" class="gm-btn" aria-pressed="false">▣ Images Only</button></div><div id="gmInstruction">Do this.</div><div id="gmSubline"></div><div id="gmActionHost"></div><div id="gmSafety" class="gm-safety">Demonstrate a comfortable, accessible movement. Accept individualized motor alternatives.</div></div><aside id="gmStaff" class="gm-panel"><h2>Staff Scoring</h2><div id="gmProgress"></div><div id="gmScores"></div><div id="gmScoreButtons"></div><div id="gmBehaviors"></div><div id="gmSaveStatus" role="status">Select Run Program to begin.</div><button id="gmRetry" type="button" class="gm-btn" hidden>Retry Save</button><button id="gmNext" type="button" class="gm-btn gm-primary" disabled>Next Program →</button></aside></section>'+
'<div id="gmRotate" role="note"><strong>Rotate iPad to landscape</strong><span>Gross Motor Imitation uses the COMPASS two-panel landscape layout.</span></div>';
main.appendChild(root);
$("gmSetup").appendChild(setup);$("setupBody").hidden=false;
const instructions=$("grossMotorInstructions");
if(instructions){$("gmStart").before(instructions);instructions.open=true;}
const intro=document.createElement("p");
intro.id="gmQuickGuide";intro.textContent="Model the movement, say “Do this,” then allow 3–5 seconds for an independent response. Use individualized prompting only during teaching. Circuit is randomized; Probe Benchmark is independent-only and is excluded from teaching mastery.";
$("gmStart").before(intro);
const top=workspace.querySelector(".trial-top"),response=workspace.querySelector(".response-row");
$("gmScores").appendChild(top);
$("gmScoreButtons").appendChild(response);
$("gmBehaviors").appendChild(behaviors);
$("gmActionHost").appendChild(choices);
workspace.hidden=true;workspace.style.display="none";
const setText=(id,v)=>{if($(id))$(id).textContent=String(v)};
const circuit=$("gmCircuit"),days=$("gmDays"),start=$("gmStart"),next=$("gmNext");
let running=false,completed=false,saveState="idle",savePromise=null,recorded=[],only=false;
let savedDtiChain=Array.from(chain.options).find(o=>o.value===C.default_chain)?.value||
  Array.from(chain.options).find(o=>o.value.split(",").every(t=>t==="T"||t==="D"))?.value||"T,T,D,T,D,D,T,T";
if(chain.value==="CIRCUIT"){circuit.value="circuit";}else if(chain.value==="PROBE_ALL"){circuit.value="probe";}
else if(chain.value) savedDtiChain=chain.value;
function getMode(){return circuit.value;}
function syncCircuit(){
  if(getMode()==="circuit")chain.value="CIRCUIT";
  else if(getMode()==="probe")chain.value="PROBE_ALL";
  else chain.value=savedDtiChain;
  chain.disabled=getMode()!=="teaching";
  if(typeof chain.onchange==="function")chain.onchange();
  else if(typeof applySetup==="function")applySetup(true);
}
circuit.addEventListener("change",syncCircuit);
chain.addEventListener("change",()=>{if(getMode()==="teaching"&&chain.value!=="CIRCUIT"&&chain.value!=="PROBE_ALL")savedDtiChain=chain.value;});
function selectedBenchmark(){
  const value=Number(benchmarkSel.value||1);
  return benchmarks.find(x=>Number(x.number)===value)||benchmarks[value-1];
}
function targetInfo(item){
  return item?.grossMotorTarget||targets.find(t=>t.name===item?.animal)||targets.find(t=>t.name===targetSel.value)||null;
}
function currentStep(){return typeof window.current==="function"?window.current():null;}
function formatDate(time){const d=new Date(time);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
function showStep(){
  if(!running)return;
  const item=currentStep(),meta=targetInfo(item)?.metadata||{};
  const num=(typeof trial==="number"?trial:0)+1,total=Array.isArray(plan)?plan.length:0;
  const isProbe=getMode()==="probe",isD=item?.type==="Distractor";
  setText("gmInstruction","Do this.");
  setText("gmSubline",(isProbe?"BENCHMARK PROBE · ":getMode()==="circuit"?"RANDOMIZED CIRCUIT · ":"TEACHING · ")+
    "Step "+num+" of "+total+" · "+(isD?"D · Maintenance":"T · Acquisition"));
  setText("gmStep","Run Program · "+num+" / "+total);
  setText("gmSafety",isProbe?"Probe: observe without teaching prompts or corrective feedback.":meta.staff_instruction||"Model a safe, accessible movement and allow 3–5 seconds before any teaching prompt.");
  const card=$("gmActionHost").querySelector(".gmi-card");
  if(card)card.setAttribute("aria-label",item?.displayName||meta.base_target||"Gross motor imitation");
  if($("promptedBtn"))$("promptedBtn").hidden=isProbe;
  const type=$("trialType");if(type&&isProbe)type.textContent="Independent Probe · "+(selectedBenchmark()?.name||"");
}
const baseRender=window.renderAll;
if(typeof baseRender==="function"){
  window.renderAll=function(){baseRender();showStep();};
}
function setOnly(value){
  only=!!value;root.classList.toggle("gm-only",only);
  const button=$("gmMaterialsOnly"),holder=only?$("gmMaterial").querySelector(".gm-line"):$("gmStaff").querySelector(".gm-line");
  // Keep the same toggle inside student materials at all times.
  button.textContent=only?"← Exit Images Only":"▣ Images Only";
  button.setAttribute("aria-pressed",String(only));
  if(only){$("gmMaterial").querySelector(".gm-line").appendChild(button);}
}
$("gmMaterialsOnly").addEventListener("click",()=>setOnly(!only));
function showRun(){
  if(!targetSel.value)return;
  const mastery=Number($("setupMastery")?.value),masteryDays=Number(days.value);
  if(!Number.isFinite(mastery)||mastery<0||mastery>100){alert("Set mastery between 0 and 100%.");return;}
  if(!Number.isInteger(masteryDays)||masteryDays<1||masteryDays>15){alert("Mastery days must be 1–15 distinct dates.");return;}
  if(getMode()==="teaching"&&chain.value!=="CIRCUIT"&&chain.value!=="PROBE_ALL")savedDtiChain=chain.value;
  syncCircuit();
  // Applying setup resets only the current run, never historical student data.
  applySetup(true);
  running=true;completed=false;saveState="idle";savePromise=null;recorded=[];
  $("gmRetry").hidden=true;next.disabled=true;
  $("gmPageOne").hidden=true;$("gmPageTwo").hidden=false;$("gmBack").hidden=false;
  setText("gmSaveStatus","Score every step. No trial is saved until COMPASS confirms.");
  showStep();
}
start.addEventListener("click",showRun);
function safeToLeave(){return !running||recorded.length===0||(completed&&saveState==="saved");}
function showBlocked(){setText("gmSaveStatus","Finish this run and confirm COMPASS saved it before leaving.");}
$("gmBack").addEventListener("click",()=>{
  if(!safeToLeave()){showBlocked();return;}
  running=false;$("gmPageTwo").hidden=true;$("gmPageOne").hidden=false;$("gmBack").hidden=true;
  setOnly(false);setText("gmStep","Program Setup → Run Program");
});
$("gmEnd").addEventListener("click",()=>{
  if(!safeToLeave()){showBlocked();return;}
  if(typeof endSession==="function")endSession();
  const bridge=window.__COMPASS_STUDENT_RUNTIME__;
  if(bridge?.autoSave)void bridge.autoSave("end_session",true);
  setText("gmStep","Session ended");
});
function eventList(){
  const bm=selectedBenchmark()?.id||"GMIM-B"+benchmarkSel.value;
  return recorded.map(row=>({
    trial_number:row.number,trial_type:row.type==="Distractor"?"D":"T",
    result:row.result==="correct"?"independent_correct":row.result==="prompted"?"prompted":"incorrect",
    target_name:row.target, target_key:row.targetKey,
    benchmark_key:bm,goal_id:window.__COMPASS_ACTIVE_GOAL_ID__||null,
    occurred_at:row.time,source:"gross_motor_imitation_v25",skill_type:"Imitation",
    probe:row.probe,instructional_date:formatDate(row.time)
  }));
}
const trialCapture=window.__COMPASS_TRIAL_CAPTURE__||{};
trialCapture.getEvents=eventList;window.__COMPASS_TRIAL_CAPTURE__=trialCapture;
async function saveCompleted(){
  if(savePromise)return savePromise;
  const bridge=window.__COMPASS_STUDENT_RUNTIME__;
  const probe=getMode()==="probe";
  const data={
    program_code:CODE,benchmark_key:selectedBenchmark()?.id||null,skill_type:"Imitation",
    trial_events:eventList(),behavior_counts:typeof counts==="object"?{...counts}:{},
    mastery_percentage:Number($("setupMastery")?.value),mastery_dates_required:Number(days.value),
    instructional_date:formatDate(new Date()),type:probe?"probe":"teaching",
    circuit_mode:getMode(),iep_goal:($("setupIepGoal")?.value||"")
  };
  saveState="saving";next.disabled=true;$("gmRetry").hidden=true;
  setText("gmSaveStatus","All "+recorded.length+" steps scored · saving to COMPASS…");
  savePromise=(async()=>{
    try{
      let result;
      if(probe){
        if(typeof bridge?.securePost!=="function")throw Error("Authenticated probe save unavailable");
        result=await bridge.securePost({action:"save_probe",...data});
      }else{
        if(typeof bridge?.autoSave!=="function")throw Error("Authenticated session save unavailable");
        result=await bridge.autoSave("program_complete",true);
      }
      if(!(result===true||result?.ok===true||(probe&&result?.probe_saved===true)))throw Error("Save not confirmed");
      saveState="saved";next.disabled=false;setText("gmSaveStatus",probe?"Independent benchmark probe saved to COMPASS.":"Teaching session saved to COMPASS.");
    }catch(error){
      saveState="failed";next.disabled=true;$("gmRetry").hidden=false;
      setText("gmSaveStatus","Save not confirmed. Retry before moving to another program.");
    }finally{savePromise=null;}
  })();
  return savePromise;
}
$("gmRetry").addEventListener("click",()=>{if(completed)void saveCompleted();});
const originalScore=window.staffScore;
window.staffScore=function(kind){
  if(!running||completed)return;
  const index=Number(trial)||0;
  const item=currentStep();
  const before=typeof tc==="number"?tc+ti+tp+dc+di+dp:null;
  if(getMode()==="probe"&&kind==="prompted")return;
  originalScore(kind); // Retains 450-ms double-tap lock and single-step auto-advance.
  const after=typeof tc==="number"?tc+ti+tp+dc+di+dp:null;
  if(before===null||after!==before+1)return;
  const t=targetInfo(item),time=new Date().toISOString();
  recorded.push({number:index+1,type:item?.type||"Target",
    target:item?.animal||t?.name||targetSel.value,targetKey:t?.key||String(t?.id||""),
    result:kind,time,probe:getMode()==="probe"});
  if(index===(Array.isArray(plan)?plan.length:0)-1){
    completed=true;
    if(getMode()!=="probe"){
      const bridge=window.__COMPASS_STUDENT_RUNTIME__;
      if(typeof bridge?.markProgramComplete==="function")bridge.markProgramComplete();
    }
    setText("gmStep","Program Complete");
    void saveCompleted();
  }else{
    setText("gmSaveStatus",recorded.length+" / "+plan.length+" steps recorded");
    showStep();
  }
};
next.addEventListener("click",()=>{
  if(!completed||saveState!=="saved"){if(completed)void saveCompleted();return;}
  if(window.parent===window)return;
  let origin="";
  try{origin=new URL(document.referrer).origin;}catch(e){}
  if(!origin||origin==="null"){setText("gmSaveStatus","Could not verify the parent COMPASS page. Return to Program Hub manually.");return;}
  const ctx=window.__COMPASS_STUDENT_RUNTIME__?.context||window.__COMPASS_STUDENT_SESSION__?.context||{};
  window.parent.postMessage({type:"compass-next-program",assignment_id:String(ctx.assignment_id||ctx.student_compass_program_id||"")},origin);
});
const originalBehavior=typeof window.setBehaviorDefinitions==="function"?window.setBehaviorDefinitions:null;
if(originalBehavior){
  window.setBehaviorDefinitions=function(items){
    const good=(Array.isArray(items)?items:[]).filter(Boolean).slice(0,8);
    if(!good.length){behaviorDefinitions=[];if(typeof renderBehaviorTracking==="function")renderBehaviorTracking();return;}
    return originalBehavior(good);
  };
  const ctx=window.__COMPASS_STUDENT_RUNTIME__?.context||window.__COMPASS_STUDENT_SESSION__?.context||{};
  const assigned=ctx.behaviors||C.behaviors;
  if(Array.isArray(assigned)&&assigned.length)window.setBehaviorDefinitions(assigned.map((v,i)=>typeof v==="string"?{key:"gm"+i,label:v}:v));
  else window.setBehaviorDefinitions([]);
}
window.addEventListener("message",e=>{
  if(e.source!==window.parent)return;
  let ref="";try{ref=new URL(document.referrer).origin;}catch(_){}
  if(!ref||e.origin!==ref)return;
  const payload=e.data||{};
  if(payload.type!=="COMPASS_DEMO_V18_CONTEXT"||!Array.isArray(payload.student?.behaviors))return;
  const list=[...new Set(payload.student.behaviors.filter(s=>typeof s==="string"&&s.trim()))].slice(0,8);
  if(originalBehavior)window.setBehaviorDefinitions(list.map((label,i)=>({key:"gm"+i,label})));
});
window.__COMPASS_GMI_V25__.ready=true;
window.__COMPASS_GMI_V25__.getState=()=>({
  mode:running?"run":"setup",completed,recorded:recorded.length,total:Array.isArray(plan)?plan.length:0,
  events:eventList(),probe:getMode()==="probe",saveState,
  behaviors:$("behaviorItems")?.children.length||0,benchmarks:benchmarks.length,targets:targets.length
});
})();