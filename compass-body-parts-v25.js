
(function(){
'use strict';
const cfg=window.COMPASS_PROGRAM_CONFIG||{};
if(cfg.program_code!=='CP-BODY-PARTS'||window.__COMPASS_BP_V25__)return;
window.__COMPASS_BP_V25__={version:'25.4',ready:false};
const $bp=id=>document.getElementById(id);
const main=document.querySelector('.app .main'),setup=document.querySelector('.program-setup'),work=$bp('workspace'),beh=$bp('behaviorBar');
if(!main||!setup||!work||!beh)return;
const palettes=[
 {skin:'#DFA77F',shirt:'#3578DF',hair:'#413327'},
 {skin:'#AB7056',shirt:'#8E63D4',hair:'#211F25'},
 {skin:'#E8BA96',shirt:'#17A38A',hair:'#684936'},
 {skin:'#93624C',shirt:'#F0A029',hair:'#241D19'},
 {skin:'#C99071',shirt:'#D86284',hair:'#38241E'},
 {skin:'#F0C8A2',shirt:'#5366BD',hair:'#674633'}
];
const points={
Head:[240,114],Eyes:[219,115],Nose:[240,140],Mouth:[240,163],Ears:[190,137],Hair:[237,57],
Hands:[98,409],Feet:[190,666],Arms:[123,324],Legs:[202,520],Fingers:[88,427],Toes:[188,684],
Shoulders:[172,248],Knees:[200,524],Elbows:[115,356],Stomach:[239,355],Back:[241,349],Neck:[240,210],
Chin:[239,182],Cheeks:[209,147],Forehead:[239,88],Eyebrows:[220,102],Eyelashes:[218,118],
Lips:[239,161],Teeth:[239,160],Tongue:[239,165],Wrist:[104,387],Ankle:[199,625],Thumb:[114,402],Heel:[193,680]
};
let avatar=0,mode='setup',imageOnly=false,startedAt=null,records=[],finished=false,studentId=null,sync='pending';
function illustration(name){
 const col=palettes[avatar],pt=points[name]||[240,350];
 const small=['Teeth','Tongue','Eyelashes','Lips','Nose','Eyes','Eyebrows','Mouth','Chin','Cheeks','Forehead','Ears','Hair'].includes(name);
 const zoom=small?2.15:['Hands','Fingers','Thumb','Wrist','Ankle','Heel','Toes'].includes(name)?1.6:1.15;
 const w=480/zoom,h=700/zoom,x=Math.max(0,Math.min(480-w,pt[0]-w/2)),y=Math.max(0,Math.min(700-h,pt[1]-h/2));
 const face=name==='Back'?'':`<path d="M198 106 q17 -8 32 0 M250 106 q17 -8 32 0" stroke="${col.hair}" stroke-width="5" fill="none"/><ellipse cx="218" cy="124" rx="6" ry="7" fill="#263c4b"/><ellipse cx="262" cy="124" rx="6" ry="7" fill="#263c4b"/><path d="M239 129 l-6 18 q8 6 15 0" stroke="#926a56" stroke-width="4" fill="none"/><path d="M215 165 q26 23 50 0" stroke="#a15a58" stroke-width="5" fill="none"/>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="700" viewBox="${x} ${y} ${w} ${h}">
 <rect width="480" height="700" rx="28" fill="#edf6ff"/><ellipse cx="240" cy="691" rx="155" ry="9" fill="#d6e7f6"/>
 <path d="M194 415 L183 623 L220 636 L233 453 L247 453 L260 635 L292 625 L286 415Z" fill="#49628f" stroke="#29436a" stroke-width="5"/>
 <path d="M181 628 L220 628 L222 669 Q198 691 151 677 L167 651Z M258 628 L291 628 L316 669 Q310 685 271 680 L252 662Z" fill="#f4f7fc" stroke="#8197b4" stroke-width="5"/>
 <path d="M181 222 Q146 230 148 286 L163 422 L318 422 L332 284 Q333 231 293 221Z" fill="${col.shirt}" stroke="#315c8b" stroke-width="5"/>
 <path d="M174 247 Q137 253 121 312 L89 389 Q83 405 103 415 Q118 417 127 390 L172 314Z M307 246 Q351 260 362 315 L395 394 Q394 416 373 416 Q361 412 353 388 L310 316Z" fill="${col.skin}" stroke="#93674f" stroke-width="5"/>
 <path d="M207 200 L209 235 Q240 257 274 234 L270 198Z" fill="${col.skin}" stroke="#93674f" stroke-width="4"/>
 <ellipse cx="240" cy="127" rx="68" ry="87" fill="${col.skin}" stroke="#96664d" stroke-width="5"/>
 <path d="M172 119 Q155 30 235 29 Q320 23 309 116 Q307 61 267 67 Q212 61 182 98Z" fill="${col.hair}"/>
 <ellipse cx="173" cy="134" rx="10" ry="19" fill="${col.skin}" stroke="#94644e" stroke-width="3"/>
 <ellipse cx="307" cy="134" rx="10" ry="19" fill="${col.skin}" stroke="#94644e" stroke-width="3"/>
 ${face}
 <path d="M95 396 l-17 13 M95 399 l-4 21 M96 402 l9 17" stroke="${col.skin}" stroke-width="10" stroke-linecap="round"/>
 <circle cx="${pt[0]}" cy="${pt[1]}" r="${name==='Head'||name==='Back'?28:18}" fill="#fff" fill-opacity=".22" stroke="#f05a36" stroke-width="7"/>
 <circle cx="${pt[0]}" cy="${pt[1]}" r="5" fill="#f05a36"/>
 <path d="M${pt[0]+42} ${pt[1]-39} L${pt[0]+11} ${pt[1]-11}" stroke="#f05a36" stroke-width="7" stroke-linecap="round"/></svg>`;
 return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
function refreshIllustrations(){
 if(typeof imageMap==='undefined'||typeof uniqueNames!=='function')return;
 uniqueNames().forEach(name=>{imageMap[name]=illustration(name)});
 if(typeof renderChoices==='function')renderChoices();
}
document.documentElement.classList.add('bp-v25');
const root=document.createElement('div');root.id='bpRoot';
root.innerHTML=`<header id="bpHeader">
 <div><div class="bp-title">Body Parts <span class="bp-subtitle">· COMPASS Instructional Program</span></div><div class="bp-subtitle" id="bpStepText">Program Setup → Run Program</div></div>
 <nav class="bp-header-actions"><button id="bpBack" type="button" class="bp-btn" hidden>← Setup</button><button id="bpEnd" type="button" class="bp-btn">End Session</button></nav></header>
 <section class="bp-page" id="bpPageOne"><div id="bpSetupMount" class="bp-panel"></div>
 <aside class="bp-panel bp-guide"><span class="bp-chip">COMPASS Body Parts · V25</span><h2>Program Instructions</h2>
 <p>Choose your target, benchmark, avatar, and DTI chain. The student is inherited from their profile.</p>
 <ol><li><b>Receptive:</b> Student identifies the named body part in a pictured array or on themselves.</li>
 <li><b>Expressive:</b> Student names the indicated body part.</li>
 <li><b>Matching:</b> Student matches the corresponding pictured body part.</li>
 <li>Score all teaching steps. Separate teaching dates are needed to establish mastery; a single run does not do so.</li></ol>
 <button id="bpRun" type="button" class="bp-btn primary bp-run">Run Program →</button></aside></section>
 <section class="bp-page" id="bpPageTwo" hidden>
 <div class="bp-panel" id="bpMaterial"><div class="bp-panel-head"><h2 class="bp-h3">Student Material</h2></div>
 <div id="bpInstruction">Ready</div><div id="bpContext"></div><div id="bpSelfNote" hidden style="background:#eef6ff;border:1px solid #c4def9;border-radius:12px;padding:18px;text-align:center;color:#22548b;font-weight:800">Student identifies the named body part on their own body. Staff observes and scores the response.</div><div id="bpChoicesMount"></div></div>
 <aside class="bp-panel" id="bpScoring"><div class="bp-panel-head"><h2 class="bp-h3">Trial &amp; Scoring</h2><button id="bpImages" type="button" class="bp-btn">▣ Images Only</button></div>
 <div id="bpScoringMount"></div><div id="bpBehaviorMount"></div>
 <div id="bpSaveStatus" role="status">Session sync has not been confirmed.</div>
 <button type="button" id="bpNextProgram" class="bp-btn primary" disabled>Next Program →</button></aside></section>`;
main.appendChild(root);
const text=(id,value)=>{const node=$bp(id);if(node)node.textContent=value};
const setupMount=$bp('bpSetupMount');
const setupTitle=document.createElement('h2');setupTitle.className='bp-h3';setupTitle.textContent='Program Setup';setupMount.appendChild(setupTitle);
setup.classList.add('bp-setup');setupMount.appendChild(setup);$bp('setupBody').hidden=false;
const extras=document.createElement('div');extras.className='setup-grid';
extras.innerHTML='<div class="setup-field"><label>Benchmark<select id="bpBenchmark"></select></label></div><div class="setup-field"><label>Illustrated Student Avatar<select id="bpAvatar"></select></label></div><div class="setup-field"><label>Response Mode<select id="bpSelf"><option value="picture">Picture Identification</option><option value="self">Self Identification</option></select></label></div>';
setupMount.insertBefore(extras,setup);
const av=$bp('bpAvatar');palettes.forEach((_,i)=>av.add(new Option('Student '+(i+1),String(i))));
const benchmarks=cfg.benchmarks&&typeof cfg.benchmarks==='object'?cfg.benchmarks:{'Practice 1–5':[1,2,3,4,5]};
const bench=$bp('bpBenchmark');
Object.keys(benchmarks).forEach(k=>bench.add(new Option(k,k)));
if(benchmarks[cfg.default_benchmark])bench.value=cfg.default_benchmark;
function selectBenchmark(){
 const allowed=new Set((Array.isArray(benchmarks[bench.value])?benchmarks[bench.value]:[]).map(Number));
 const sel=$bp('setupTarget'),original=sel.value;
 sel.innerHTML='';
 (Array.isArray(cfg.targets)?cfg.targets:[]).filter(x=>!allowed.size||allowed.has(Number(x.id))).forEach(t=>sel.add(new Option(t.name,t.name)));
 if([...sel.options].some(x=>x.value===original))sel.value=original;
}
bench.addEventListener('change',selectBenchmark);selectBenchmark();
av.addEventListener('change',()=>{avatar=Number(av.value)||0;refreshIllustrations()});
const choices=$bp('choices'),top=work.querySelector('.trial-top'),response=work.querySelector('.response-row');
if(!choices||!top||!response)return;
$bp('bpChoicesMount').appendChild(choices);$bp('bpScoringMount').appendChild(top);$bp('bpScoringMount').appendChild(response);$bp('bpBehaviorMount').appendChild(beh);
work.hidden=true;work.style.display='none';
const imageButton=$bp('bpImages'),scoreHeader=$bp('bpScoring').querySelector('.bp-panel-head'),materialHeader=$bp('bpMaterial').querySelector('.bp-panel-head');
function toggleImages(){
 imageOnly=!imageOnly;root.classList.toggle('bp-images-only',imageOnly);
 (imageOnly?materialHeader:scoreHeader).appendChild(imageButton);
 imageButton.textContent=imageOnly?'← Exit Images Only':'▣ Images Only';
 imageButton.setAttribute('aria-pressed',String(imageOnly));
}
imageButton.addEventListener('click',()=>{if(!imageButton.disabled)toggleImages()});
function syncDisplay(){
 const step=typeof trial==='number'?trial+1:1,total=Array.isArray(plan)?plan.length:0;
 const q=typeof current==='function'?current():null;
 const self=$bp('bpSelf')?.value==='self',name=q?.animal||target||'Body Part';
 text('bpInstruction',self?'Show me your '+name.toLowerCase()+'.':q?.instruction||$bp('instruction')?.textContent||'Show me the body part.');
 text('bpContext','Step '+step+' / '+total+' · '+(q?.type||'Target')+' · '+name+(self?' · Self Identification':''));
 text('bpStepText','Run Program · Step '+step+' of '+total);
 choices.style.maxWidth='none';choices.style.width='100%';choices.style.display=self?'none':'grid';
 const modeNote=$bp('bpSelfNote');
 if(modeNote)modeNote.hidden=!self;
 const imgBtn=$bp('bpImages');if(imgBtn)imgBtn.disabled=self;
}
const priorRender=typeof renderAll==='function'?renderAll:null;
if(priorRender)renderAll=function(){priorRender();syncDisplay()};
if(Array.isArray(cfg.behaviors)&&!cfg.behaviors.length){
 try{behaviorDefinitions=[];renderBehaviorTracking()}catch(_){}
}
function start(){
 if(!$bp('setupTarget').value)return;
 $bp('setupScoring').value='staff';
 if(typeof applySetup==='function')applySetup(true);
 records=[];finished=false;startedAt=new Date().toISOString();sync='pending';
 mode='run';$bp('bpPageOne').hidden=true;$bp('bpPageTwo').hidden=false;$bp('bpBack').hidden=false;root.classList.add('bp-running');
 $bp('bpNextProgram').disabled=true;text('bpSaveStatus','Score each step · cloud sync pending.');
 syncDisplay();
}
$bp('bpRun').addEventListener('click',start);
$bp('bpBack').addEventListener('click',()=>{mode='setup';root.classList.remove('bp-running');$bp('bpPageTwo').hidden=true;$bp('bpPageOne').hidden=false;$bp('bpBack').hidden=true;if(imageOnly)toggleImages();text('bpStepText','Program Setup → Run Program')});
$bp('bpEnd').addEventListener('click',()=>{if(!confirm('End session? Unsynced data may be lost.'))return;if(typeof endSession==='function')endSession();text('bpStepText','Session ended')});
for(const [id,name] of [['correctBtn','correct'],['incorrectBtn','incorrect'],['promptedBtn','prompted']]){
 const btn=$bp(id);if(!btn)continue;
 btn.addEventListener('click',()=>{
  if(mode!=='run'||!lastScored)return;
  const q=typeof current==='function'?current():null;
  records.push({step:Number(trial)||0,phase:q?.type||'Target',target:q?.animal||target,response:name,recordedAt:new Date().toISOString()});
  text('bpSaveStatus','Recorded step '+records.length+' of '+plan.length+' · sync pending');
  if(Number(trial)<plan.length-1){
   const at=trial;
   setTimeout(()=>{if(mode==='run'&&lastScored&&trial===at&&typeof nextTrial==='function')nextTrial()},130);
  }else{
   finished=true;$bp('bpNextProgram').disabled=false;
   text('bpSaveStatus','Run complete · Awaiting COMPASS save confirmation.');
   try{window.__COMPASS_STUDENT_RUNTIME__?.markProgramComplete?.()}catch(e){console.warn('Body Parts sync trigger pending',e)}
   window.parent.postMessage({type:'COMPASS_BODY_PARTS_RUN_COMPLETE',studentId,run:{
     id:'BP-'+(crypto.randomUUID?.()||Date.now()),records,startedAt,recordedAt:new Date().toISOString(),
     benchmark:bench.value,target,avatar,behavior_counts:{...counts},instructionalDate:new Date().toISOString().slice(0,10)
   }},location.origin);
  }
 });
}
$bp('bpNextProgram').addEventListener('click',()=>{
 if(!finished)return;
 if(sync!=='confirmed'&&!confirm('Cloud save is not confirmed. Move to the next program anyway?'))return;
 window.parent.postMessage({type:'compass-next-program'},location.origin);
});
window.addEventListener('message',event=>{
 if(event.source!==window.parent||event.origin!==location.origin)return;
 const m=event.data||{};
 if(m.type==='COMPASS_DEMO_V18_CONTEXT'){
  studentId=m.student?.id||null;
  const selected=[...new Set((Array.isArray(m.student?.behaviors)?m.student.behaviors:[]).filter(x=>typeof x==='string'&&x.trim()))].slice(0,8);
  try{if(selected.length)setBehaviorDefinitions(selected.map((x,i)=>({key:'bp'+i,label:x})));else{behaviorDefinitions=[];renderBehaviorTracking()}}catch(_){}
 }
 if(m.type==='COMPASS_BODY_PARTS_SYNC_CONFIRMED'){sync='confirmed';text('bpSaveStatus','Session saved to COMPASS.');}
 if(m.type==='COMPASS_BODY_PARTS_SYNC_FAILED'){sync='failed';text('bpSaveStatus','COMPASS save could not be confirmed. '+(m.message||''));}
});
refreshIllustrations();syncDisplay();window.__COMPASS_BP_V25__.ready=true;
})();
