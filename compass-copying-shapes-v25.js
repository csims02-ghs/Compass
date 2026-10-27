(function(){
"use strict";
const C=window.COMPASS_PROGRAM_CONFIG||{};
if(C.program_code!=="CP-107-COPYING-SHAPES-AND-VISUAL-MOTOR-INTEGRATION"||window.__COMPASS_COPY_V25__)return;
const $=id=>document.getElementById(id);
const main=document.querySelector(".app .main"),setup=document.querySelector(".program-setup"),workspace=$("workspace"),behavior=$("behaviorBar");
if(!main||!setup||!workspace||!behavior||!$("choices")||!workspace.querySelector(".trial-top")||!workspace.querySelector(".response-row"))return;
window.__COMPASS_COPY_V25__={version:"25.4",ready:false};
document.documentElement.classList.add("bp-v25","copy-v25");
const root=document.createElement("div");root.id="bpRoot";
root.innerHTML=
'<header id="bpHeader"><div><div class="bp-title">Copying Shapes &amp; Visual-Motor Integration <span class="bp-subtitle">· COMPASS Instructional Program</span></div><div class="bp-subtitle" id="bpStepText">Program Setup → Run Program</div></div><nav class="bp-header-actions"><button class="bp-btn" type="button" id="bpBack" hidden>← Setup</button><button class="bp-btn" type="button" id="bpEnd">End Session</button></nav></header>'+
'<section class="bp-page" id="bpPageOne"><div class="bp-panel" id="bpSetupMount"></div><aside class="bp-panel bp-guide"><span class="bp-chip">VISUAL-MOTOR · V25</span><h2>Program Instructions</h2><p>Select a 10-target benchmark, target, skill, DTI chain, mastery threshold, writing method, IEP goal and circuit. This program uses staff-scored copying, not answer choices.</p><ol><li><b>Application:</b> Present one clear visual model and say “Copy this.” Allow finger/stylus drawing or separate paper.</li><li><b>Generalization:</b> Vary model size, orientation, tool or setting without changing the target criterion.</li><li><b>Score:</b> Independent, Incorrect or Prompted for each T and D step. Assess the defining visual features, not irrelevant neatness.</li><li><b>Motor access:</b> Use adapted tools and individual supports. Do not force hand-over-hand prompting.</li><li><b>Circuit:</b> Benchmark probes are separate from teaching mastery. Mastery requires configured accuracy across distinct instructional dates.</li></ol><button type="button" id="bpRun" class="bp-btn primary bp-run">Run Program →</button></aside></section>'+
'<section class="bp-page" id="bpPageTwo" hidden><div class="bp-panel" id="bpMaterial"><div class="bp-panel-head"><h2 class="bp-h3">Student Material</h2></div><div id="bpInstruction">Ready</div><div id="bpContext"></div><div id="bpChoicesMount"></div></div><aside class="bp-panel" id="bpScoring"><div class="bp-panel-head"><h2 class="bp-h3">Trial &amp; Scoring</h2><button type="button" id="bpImages" class="bp-btn" aria-pressed="false">▣ Images Only</button></div><div id="bpScoringMount"></div><div id="bpBehaviorMount"></div><div id="bpSaveStatus" role="status">Start the program to collect data.</div><button type="button" id="bpNextProgram" class="bp-btn primary" disabled>Next Program →</button></aside></section>';
main.appendChild(root);
const mount=$("bpSetupMount"),label=document.createElement("h2");label.className="bp-h3";label.textContent="Program Setup";mount.appendChild(label);
const extra=document.createElement("div");extra.className="setup-grid copy-extra-fields";
extra.innerHTML='<div class="setup-field"><label for="bpCircuit">Circuit</label><select id="bpCircuit"><option value="teaching">N/A · Teaching</option><option value="probe">Probe Benchmark</option></select></div><div class="setup-field"><label for="bpMasteryDays">Mastery qualifying dates</label><input id="bpMasteryDays" type="number" min="1" max="15" value="3"></div>';
mount.appendChild(extra);setup.classList.add("bp-setup");mount.appendChild(setup);$("setupBody").hidden=false;
const groups=(Array.isArray(C.benchmark_sets)?C.benchmark_sets:[]).map((b,i)=>({
 id:Number(b.id)||i+1,key:"copy-b"+(Number(b.id)||i+1),label:"Benchmark "+(Number(b.id)||i+1)+" — "+b.name,
 members:(Array.isArray(C.targets)?C.targets:[]).filter(t=>Number(t.metadata?.benchmark)===Number(b.id)).map(t=>Number(t.id))
}));
const bench=$("setupBenchmark");
if(!bench||groups.length!==4)throw Error("Copying Shapes must have four target benchmarks");
function selectedGroup(){return groups.find(b=>String(b.id)===bench.value)||groups[0]}
const choices=$("choices"),top=workspace.querySelector(".trial-top"),response=workspace.querySelector(".response-row");
choices.hidden=true;
const modelStage=document.createElement("div");modelStage.id="copyVisualModel";modelStage.setAttribute("role","group");modelStage.setAttribute("aria-label","Visual model to copy");
modelStage.innerHTML='<div class="copy-model-title">Look at the model</div><div class="copy-model-canvas" id="copyShapeModel"></div>';
$("bpMaterial").insertBefore(modelStage,$("bpChoicesMount"));
const drawing=document.getElementById("cp107DrawingWorkspace");
if(drawing)$("bpChoicesMount").appendChild(drawing);
const paperNote=document.createElement("div");paperNote.id="copyPaperNote";paperNote.hidden=true;paperNote.textContent="Copy the model on separate paper. Staff score the learner’s response."; $("bpChoicesMount").appendChild(paperNote);
const staffTask=document.createElement("div");staffTask.id="copyStaffTask";$("bpScoringMount").appendChild(staffTask);
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

const ln=(a,b,c,d)=>'<line x1="'+a+'" y1="'+b+'" x2="'+c+'" y2="'+d+'"/>';
const cr=(x,y,r)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'"/>';
const dot=(x,y)=>'<circle cx="'+x+'" cy="'+y+'" r="8" fill="#15385c" stroke="none"/>';
const rect=(x,y,w,h)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"/>';
const poly=p=>'<polyline points="'+p+'" />';
const pg=p=>'<polygon points="'+p+'" />';
const P={
 1:ln(150,35,150,180),2:ln(45,108,255,108),3:ln(60,165,240,40),4:ln(60,40,240,165),
 5:ln(105,35,105,180)+ln(195,35,195,180),6:ln(45,70,255,70)+ln(45,145,255,145),
 7:ln(150,34,150,180)+ln(55,108,245,108),8:ln(65,40,235,175)+ln(235,40,65,175),
 9:cr(150,106,80),10:cr(150,106,35),11:rect(78,36,145,145),12:rect(116,75,70,70),
 13:pg("150,30 250,180 50,180"),14:rect(40,67,220,93),
 15:'<ellipse cx="150" cy="106" rx="105" ry="65"/>',16:pg("150,25 253,106 150,187 47,106"),
 17:pg("150,20 178,77 243,84 194,126 209,189 150,154 91,189 106,126 57,84 122,77"),
 18:'<path d="M 55 160 A 95 95 0 0 1 245 160 Z"/>',
 19:'<path d="M 30 110 Q 60 28 90 110 T 150 110 T 210 110 T 270 110"/>',
 20:poly("24,160 75,44 126,160 177,44 228,160 278,44"),
 21:cr(105,108,57)+cr(205,108,57),
 22:cr(150,62,44)+rect(107,120,86,70),
 23:pg("150,22 198,100 102,100")+rect(103,111,94,83),
 24:rect(42,67,94,94)+rect(150,88,111,71),
 25:dot(85,108)+dot(150,108)+dot(215,108),
 26:dot(150,40)+dot(95,145)+dot(205,145),
 27:[75,225].map(x=>[60,150].map(y=>dot(x,y)).join("")).join(""),
 28:[70,150,230].map(x=>[60,150].map(y=>dot(x,y)).join("")).join(""),
 29:cr(65,106,36)+rect(122,70,70,70)+cr(239,106,36),
 30:rect(23,76,54,54)+pg("113,55 150,135 76,135")+rect(164,76,54,54)+pg("253,55 290,135 216,135"),
 31:cr(150,106,80)+ln(108,146,193,68),
 32:rect(78,36,145,145)+ln(78,36,223,181),
 33:poly("42,165 105,165 105,120 170,120 170,76 245,76 245,35"),
 34:pg("65,165 122,54 179,165")+pg("179,165 237,54 295,165"),
 35:pg("150,30 260,105 40,105")+rect(70,105,160,90)+rect(133,137,35,58),
 36:rect(135,140,30,54)+pg("150,24 80,104 220,104")+pg("150,65 62,150 238,150"),
 37:[["90","58"],["148","58"],["206","58"],["90","116"],["148","116"],["206","116"]].map(p=>rect(+p[0]-23,+p[1]-23,46,46)).join(""),
 38:[60,120,180,240].map(x=>[73,139].map(y=>rect(x-21,y-21,42,42)).join("")).join(""),
 39:cr(70,105,32)+pg("150,68 188,139 112,139")+rect(220,75,60,60),
 40:rect(19,72,56,56)+cr(116,100,30)+pg("207,67 240,134 174,134")+pg("267,60 278,89 298,92 283,110 288,139 267,125 247,139 253,110 236,92 256,89")
};
function renderShapeModel(item){
 const name=item?.custom?null:(item?.animal||$("setupTarget")?.value);
 const match=(Array.isArray(C.targets)?C.targets:[]).find(t=>t.name===name);
 const index=Number(match?.id)||0;
 $("copyShapeModel").innerHTML=index&&P[index]?'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 210" role="img" aria-label="Model for '+index+'" stroke="#15385c" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">'+P[index]+'</svg>':'<div class="copy-custom-step">Follow the staff’s demonstrated distractor action.</div>';
 $("copyStaffTask").textContent=item?.custom?"Distractor: "+String(item.action||"Follow staff direction"):"Staff target: "+String(name||"Choose target");
 const pen=$("cp107WritingMethod")?.value==="paper";
 $("copyPaperNote").hidden=!pen;
 if(drawing)drawing.hidden=pen;
 window.dispatchEvent(new Event("resize"));
}

function syncVisual(){
 if(mode!=="run")return;
 const item=typeof current==="function"?current():null;
 const step=typeof trial==="number"?trial+1:1,total=Array.isArray(plan)?plan.length:0;
 $text("bpInstruction",item?.custom?"Do this.":"Copy this.");
 $text("bpContext","Step "+step+" / "+total+" · "+(item?.type||"Target"));
 $text("bpStepText","Run Program · Step "+step+" of "+total);
 renderShapeModel(item);
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
 // Explicit per-step trial records prevent prompted responses disappearing from
 // the generic counter-based legacy capture. Saving remains authenticated.
 const capture=window.__COMPASS_TRIAL_CAPTURE__||{};
 capture.getEvents=function(){
  const targetName=$("setupTarget")?.value||target||"";
  const targetRow=Array.isArray(C.targets)?C.targets.find(x=>x.name===targetName):null;
  const benchmark=selectedGroup();
  return recorded.map(x=>({
   trial_number:x.step,trial_type:x.type==="Distractor"?"D":"T",
   result:x.result==="correct"?"independent_correct":x.result==="prompted"?"prompted":"incorrect",
   target_name:targetName,target_key:targetRow?.key||null,
   benchmark_key:benchmark?.key||null,goal_id:window.__COMPASS_ACTIVE_GOAL_ID__||null,
   occurred_at:x.time,source:"copying_shapes_v25_step"
  }));
 };
 window.__COMPASS_TRIAL_CAPTURE__=capture;
 const total=Array.isArray(plan)?plan.length:0;
 $text("bpSaveStatus","Recorded "+recorded.length+" / "+total+" teaching steps.");
 if(at<total-1){
  setTimeout(()=>{if(mode==="run"&&lastScored&&Number(trial)===at&&typeof nextTrial==="function")nextTrial()},100);
  return;
 }
 complete=true;syncState="pending";
 $text("bpSaveStatus","All steps scored · saving to COMPASS…");
 const runtime=window.__COMPASS_STUDENT_RUNTIME__;
 if($("bpCircuit").value!=="probe"&&runtime?.markProgramComplete)runtime.markProgramComplete();
 const probe=$("bpCircuit").value==="probe";
 const targetName=$("setupTarget").value,chosen=C.targets.find(t=>t.name===targetName);
 const metadata={program_code:C.program_code,benchmark_key:selectedGroup().key,skill_type:$("setupSkillType").value,
    trial_events:capture.getEvents(),behavior_counts:typeof counts==="object"?{...counts}:{},instructional_date:new Date().toLocaleDateString("en-CA"),
    mastery_percentage:Number($("setupMastery").value),mastery_dates_required:Number($("bpMasteryDays").value),
    writing_method:$("cp107WritingMethod")?.value||"tablet",target_key:chosen?.key||null};
 const saver=probe?runtime?.securePost?.({action:"save_probe",...metadata}):runtime?.autoSave?.("program_complete",true);
 if(saver){
  Promise.resolve(saver).then(result=>{
   syncState=(result?.ok||probe&&result?.probe_saved)?"saved":"failed";
   $text("bpSaveStatus",syncState==="saved"?(probe?"Benchmark probe saved to COMPASS.":"Teaching session saved to COMPASS."):"Save not confirmed; retry before continuing.");
   $("bpNextProgram").disabled=syncState!=="saved";
  }).catch(()=>{syncState="failed";$text("bpSaveStatus","Save failed; retry before continuing.");$("bpNextProgram").disabled=true});
 }else{
  syncState="unverified";$text("bpSaveStatus",probe?"Probe saving requires a connected COMPASS session.":"Signed-in COMPASS save bridge not detected.");
  $("bpNextProgram").disabled=true;
 }
}
[["correctBtn","correct"],["incorrectBtn","incorrect"],["promptedBtn","prompted"]].forEach(([id,result])=>{
 $(id)?.addEventListener("click",()=>onScore(result));
});
$("bpNextProgram").addEventListener("click",()=>{
 if(!complete)return;
 if(syncState!=="saved"&&!confirm("Cloud save has not been confirmed. Proceed to next program?"))return;
 if(window.parent!==window){
  let origin=location.origin;try{origin=new URL(document.referrer).origin||origin}catch(e){}
  const context=window.__COMPASS_STUDENT_RUNTIME__?.context||window.__COMPASS_STUDENT_SESSION__?.context||{};
  window.parent.postMessage({type:"compass-next-program",assignment_id:String(context.assignment_id||context.student_compass_program_id||"")},origin);
 }
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
 setBehaviorDefinitions(list.map((s,i)=>({key:"copy"+i,label:s})));
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
$("cp107WritingMethod")?.addEventListener("change",()=>{if(mode==="run")renderShapeModel(typeof current==="function"?current():null)});
window.__COMPASS_COPY_V25__.getState=()=>({mode,complete,steps:recorded.length,total:plan?.length||0,syncState,modelCount:Object.keys(P).length,behaviorCount:document.querySelectorAll("#behaviorItems>.behavior").length,writingMethod:$("cp107WritingMethod")?.value,probe:$("bpCircuit").value==="probe"});
window.__COMPASS_COPY_V25__.ready=true;
})();