(function(){
"use strict";
const C=window.COMPASS_PROGRAM_CONFIG||{};
if(C.program_code!=="CP-CLOTHING-IDENTIFICATION"||window.__COMPASS_CLO_V25__)return;
const $=id=>document.getElementById(id);
const main=document.querySelector(".app .main"),setup=document.querySelector(".program-setup"),workspace=$("workspace"),behavior=$("behaviorBar");
if(!main||!setup||!workspace||!behavior||!$("choices")||!workspace.querySelector(".trial-top")||!workspace.querySelector(".response-row"))return;
window.__COMPASS_CLO_V25__={version:"25.4",ready:false};
document.documentElement.classList.add("bp-v25","clo-v25");
const root=document.createElement("div");root.id="bpRoot";
root.innerHTML=
'<header id="bpHeader"><div><div class="bp-title">Clothing <span class="bp-subtitle">· COMPASS Instructional Program</span></div><div class="bp-subtitle" id="bpStepText">Program Setup → Run Program</div></div><nav class="bp-header-actions"><button class="bp-btn" type="button" id="bpBack" hidden>← Setup</button><button class="bp-btn" type="button" id="bpEnd">End Session</button></nav></header>'+
'<section class="bp-page" id="bpPageOne"><div class="bp-panel" id="bpSetupMount"></div><aside class="bp-panel bp-guide"><span class="bp-chip">CLOTHING · V25</span><h2>Program Instructions</h2><p>Choose benchmark, target, skill, array size, DTI chain, mastery and linked IEP goal. Student identity is inherited from Student Profile.</p><ol><li><b>Receptive:</b> Say “Show me the [clothing item].” Present a picture array with rotating distractors.</li><li><b>Expressive:</b> Show one photo and ask “What is this called?”</li><li><b>Matching:</b> Present an example image and matching alternatives.</li><li>Score every T and D teaching step. Probe scores do not establish instructional mastery.</li><li>Mastery requires performance on three separate instructional dates, not repeated runs on one date.</li></ol><button type="button" id="bpRun" class="bp-btn primary bp-run">Run Program →</button></aside></section>'+
'<section class="bp-page" id="bpPageTwo" hidden><div class="bp-panel" id="bpMaterial"><div class="bp-panel-head"><h2 class="bp-h3">Student Material</h2></div><div id="bpInstruction">Ready</div><div id="bpContext"></div><div id="bpChoicesMount"></div></div><aside class="bp-panel" id="bpScoring"><div class="bp-panel-head"><h2 class="bp-h3">Trial &amp; Scoring</h2><button type="button" id="bpImages" class="bp-btn" aria-pressed="false">▣ Images Only</button></div><div id="bpScoringMount"></div><div id="bpBehaviorMount"></div><div id="bpSaveStatus" role="status">Start the program to collect data.</div><button type="button" id="bpNextProgram" class="bp-btn primary" disabled>Next Program →</button></aside></section>';
main.appendChild(root);
const mount=$("bpSetupMount"),label=document.createElement("h2");label.className="bp-h3";label.textContent="Program Setup";mount.appendChild(label);
const extra=document.createElement("div");extra.className="setup-grid";extra.innerHTML='<div class="setup-field"><label for="bpBenchmark">Benchmark</label><select id="bpBenchmark"></select></div>';
mount.appendChild(extra);setup.classList.add("bp-setup");mount.appendChild(setup);$("setupBody").hidden=false;
const raw=Array.isArray(C.compass_v25_standard?.benchmarks)?C.compass_v25_standard.benchmarks:[];
const groups=raw.length?raw:(Array.isArray(C.benchmark_sets)?C.benchmark_sets:[]).map(b=>({...b,members:Array.from({length:b.end-b.start+1},(_,i)=>i+b.start)}));
const bench=$("bpBenchmark");groups.forEach((b,i)=>bench.add(new Option(b.label||"Benchmark "+(i+1),String(i))));
function targetFilter(){
 const group=groups[Number(bench.value)||0],allowed=new Set((group?.members||[]).map(Number));
 const select=$("setupTarget"),before=select.value;
 const set=(Array.isArray(C.targets)?C.targets:[]).filter(t=>!allowed.size||allowed.has(Number(t.id)));
 select.replaceChildren();set.forEach(t=>select.add(new Option(t.name,t.name)));
 if([...select.options].some(o=>o.value===before))select.value=before;
 if(typeof updatePreview==="function")updatePreview();
}
bench.addEventListener("change",targetFilter);targetFilter();
const choices=$("choices"),top=workspace.querySelector(".trial-top"),response=workspace.querySelector(".response-row");
$("bpChoicesMount").appendChild(choices);$("bpScoringMount").append(top,response);$("bpBehaviorMount").appendChild(behavior);
workspace.hidden=true;workspace.style.display="none";
const $text=(id,v)=>{if($(id))$(id).textContent=String(v)};
let mode="setup",imageOnly=false,complete=false,seen=new Set(),recorded=[],syncState="pending";
const imageButton=$("bpImages"),materialHeader=$("bpMaterial").querySelector(".bp-panel-head"),scoreHeader=$("bpScoring").querySelector(".bp-panel-head");
function toggleImages(){
 imageOnly=!imageOnly;root.classList.toggle("bp-images-only",imageOnly);
 (imageOnly?materialHeader:scoreHeader).appendChild(imageButton);
 imageButton.textContent=imageOnly?"← Exit Images Only":"▣ Images Only";
 imageButton.setAttribute("aria-pressed",String(imageOnly));
}
imageButton.addEventListener("click",toggleImages);
function syncVisual(){
 if(mode!=="run")return;
 const item=typeof current==="function"?current():null;
 const step=typeof trial==="number"?trial+1:1,total=Array.isArray(plan)?plan.length:0;
 $text("bpInstruction",item?.instruction||$("instruction")?.textContent||"Identify the clothing item.");
 $text("bpContext","Step "+step+" / "+total+" · "+(item?.type||"Target")+" · "+(item?.animal||target||"Clothing"));
 $text("bpStepText","Run Program · Step "+step+" of "+total);
 choices.style.width="100%";choices.style.maxWidth="none";
}
if(typeof renderAll==="function"){const originalRender=renderAll;renderAll=function(){originalRender();syncVisual()}}
function begin(){
 if(!$("setupTarget")?.value)return;
 const mastery=Number($("setupMastery")?.value);
 if(!Number.isFinite(mastery)||mastery<0||mastery>100){alert("Mastery must be between 0 and 100 percent.");return}
 $("setupScoring").value="staff";
 if(typeof applySetup==="function")applySetup(true);
 mode="run";complete=false;seen=new Set();recorded=[];syncState="pending";
 $("bpPageOne").hidden=true;$("bpPageTwo").hidden=false;$("bpBack").hidden=false;
 $("bpNextProgram").disabled=true;
 $text("bpSaveStatus","Score each T/D step · awaiting completion.");
 syncVisual();
}
$("bpRun").addEventListener("click",begin);
$("bpBack").addEventListener("click",()=>{
 if(mode==="run"&&!complete&&recorded.length&&!confirm("Return to setup? Complete or save the current run first."))return;
 mode="setup";$("bpPageTwo").hidden=true;$("bpPageOne").hidden=false;$("bpBack").hidden=true;
 if(imageOnly)toggleImages();$text("bpStepText","Program Setup → Run Program");
});
$("bpEnd").addEventListener("click",()=>{
 if(!confirm("End this session? Unsaved work may be queued for retry."))return;
 if(typeof endSession==="function")endSession();
 window.__COMPASS_STUDENT_RUNTIME__?.autoSave?.("end_session",true);
 $text("bpStepText","Session ended");
});
function onScore(result){
 if(mode!=="run"||complete||typeof lastScored==="undefined"||!lastScored)return;
 const at=Number(trial)||0;if(seen.has(at))return;
 const item=typeof current==="function"?current():null;
 seen.add(at);
 recorded.push({step:at+1,type:item?.type||"Target",target:item?.animal||target||"",result,time:new Date().toISOString()});
 const total=Array.isArray(plan)?plan.length:0;
 $text("bpSaveStatus","Recorded "+recorded.length+" / "+total+" teaching steps.");
 if(at<total-1){
  setTimeout(()=>{if(mode==="run"&&lastScored&&Number(trial)===at&&typeof nextTrial==="function")nextTrial()},100);
  return;
 }
 complete=true;syncState="pending";
 $text("bpSaveStatus","All steps scored · saving to COMPASS…");
 const runtime=window.__COMPASS_STUDENT_RUNTIME__;
 if(runtime?.markProgramComplete)runtime.markProgramComplete();
 if(runtime?.autoSave){
  Promise.resolve(runtime.autoSave("program_complete",true)).then(result=>{
    syncState=result?.ok?"saved":"queued";
    $text("bpSaveStatus",syncState==="saved"?"Session saved to COMPASS.":"Session queued for retry; cloud save not yet confirmed.");
    $("bpNextProgram").disabled=false;
  }).catch(()=>{
    syncState="failed";$text("bpSaveStatus","Cloud save not confirmed. Please retry before leaving.");$("bpNextProgram").disabled=false;
  });
 }else{
  syncState="unverified";$text("bpSaveStatus","Session completed; signed-in COMPASS save bridge not detected.");$("bpNextProgram").disabled=false;
 }
}
[["correctBtn","correct"],["incorrectBtn","incorrect"],["promptedBtn","prompted"]].forEach(([id,result])=>{
 $(id)?.addEventListener("click",()=>onScore(result));
});
$("bpNextProgram").addEventListener("click",()=>{
 if(!complete)return;
 if(syncState!=="saved"&&!confirm("Cloud save has not been confirmed. Proceed to next program?"))return;
 if(!window.__COMPASS_STUDENT_RUNTIME__&&window.parent!==window)
  window.parent.postMessage({type:"compass-next-program"},location.origin);
});
const previousSet=typeof setBehaviorDefinitions==="function"?setBehaviorDefinitions:null;
if(previousSet){
 setBehaviorDefinitions=function(list){
  const a=(Array.isArray(list)?list:[]).filter(Boolean).slice(0,8);
  if(!a.length){behaviorDefinitions=[];if(typeof renderBehaviorTracking==="function")renderBehaviorTracking();return}
  return previousSet(a);
 };
 if(Array.isArray(C.behaviors)&&C.behaviors.length)setBehaviorDefinitions(C.behaviors);
 else if(Array.isArray(behaviorDefinitions)&&behaviorDefinitions.length&&behaviorDefinitions.some(x=>x&&x.label&&!/^Behavior [0-9]+$/i.test(x.label)))setBehaviorDefinitions(behaviorDefinitions);
 else{behaviorDefinitions=[];if(typeof renderBehaviorTracking==="function")renderBehaviorTracking()}
}
window.addEventListener("message",e=>{
 if(e.source!==window.parent||e.origin!==location.origin)return;
 const data=e.data||{};
 if(data.type!=="COMPASS_DEMO_V18_CONTEXT"||!Array.isArray(data.student?.behaviors))return;
 const list=[...new Set(data.student.behaviors.filter(x=>typeof x==="string"&&x.trim()))].slice(0,8);
 setBehaviorDefinitions(list.map((s,i)=>({key:"clo"+i,label:s})));
});
// Capture clicks before legacy navigation boot can bypass required session persistence.
window.addEventListener("click",function(event){
 const b=event.target?.closest?.("button");
 if(b?.id!=="bpNextProgram")return;
 if(!complete||syncState!=="saved"){
   event.preventDefault();event.stopImmediatePropagation();
   if(complete){
     $text("bpSaveStatus","Save confirmation required before continuing. Retrying…");
     const rt=window.__COMPASS_STUDENT_RUNTIME__;
     if(rt?.autoSave)Promise.resolve(rt.autoSave("program_complete",true)).then(res=>{
       syncState=res?.ok?"saved":"queued";
       $text("bpSaveStatus",syncState==="saved"?"Session saved to COMPASS. You can continue.":"Save queued, but not yet confirmed.");
     }).catch(()=>$text("bpSaveStatus","Cloud save failed; remain on this program."));
   }
 }
},true);
window.__COMPASS_CLO_V25__.ready=true;
})();