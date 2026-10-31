/* 1:1 Counting V25 explicit Save Setup — only the live native counting runner.
   Uses Program Hub's authenticated, assignment-scoped save proxy; never stores staff tokens. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const program=$('setupPage'),fold=$('setupFold');
if(!program||!fold||!$('benchmarkSelect')||!$('targetSelect')||!$('runBtn')||window.COMPASS_COUNTING_SETUP_SAVE)return;
const toolbar=document.createElement('div');
toolbar.id='countingSaveToolbar';
toolbar.setAttribute('role','group');
toolbar.setAttribute('aria-label','Counting program setup actions');
toolbar.innerHTML='<button id="countingSaveSetupBtn" class="btn primary" type="button">Save Setup</button>'+
 '<button id="countingRestoreSetupBtn" class="btn" type="button" hidden>Restore Saved Setup</button>'+
 '<span id="countingSaveSetupStatus" role="status" aria-live="polite">Select Save Setup to save this student’s settings to COMPASS.</span>';
const banner=program.querySelector('.setup-banner');
if(banner)banner.insertAdjacentElement('afterend',toolbar);
else fold.insertAdjacentElement('beforebegin',toolbar);
const saveBtn=$('countingSaveSetupBtn'),restoreBtn=$('countingRestoreSetupBtn'),status=$('countingSaveSetupStatus');
const fields=['benchmarkSelect','targetSelect','chainSelect','skillSelect','scoringSelect','arraySize','distractorSelect',
 'goalSelect','masterySelect','materialSelect','modeSelect','trialsSelect','masteryTrialsSelect',
 'minOpportunitiesSelect','circuitSelect'];
const state={assignmentId:'',studentId:'',parentOrigin:'',cloud:null,pending:null,dirty:false,loaded:false,linkedGoals:[]};
const uuidRE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const updateStatus=(message,kind)=>{
 status.textContent=message;
 status.dataset.status=kind||'info';
};
function setupSnapshot(){
 const values={};
 for(const id of fields){
  const node=$(id);if(node)values[id]=node.value;
 }
 const nums=['arraySize','masterySelect','masteryTrialsSelect','minOpportunitiesSelect','targetSelect'];
 for(const id of nums)if(values[id]!==undefined)values[id]=Number(values[id]);
 values.customDistractor=$('doThisSelect')?.value||'rotate';
 if(values.goalSelect){
  const found=state.linkedGoals.find(g=>g.id===values.goalSelect||g.title===values.goalSelect);
  values.goalSelect=found?.id||values.goalSelect;
 }
 return values;
}
function validateSave(data){
 if(!Number.isInteger(data.masterySelect)||data.masterySelect<1||data.masterySelect>100)return 'Enter a mastery percentage from 1 to 100.';
 if(!Number.isInteger(data.masteryTrialsSelect)||data.masteryTrialsSelect<1||data.masteryTrialsSelect>30)return 'Enter 1–30 separate mastery days.';
 if(!Number.isInteger(data.minOpportunitiesSelect)||data.minOpportunitiesSelect<1||data.minOpportunitiesSelect>50)return 'Enter 1–50 minimum opportunities per day.';
 if(!Number.isInteger(data.arraySize)||data.arraySize<3||data.arraySize>100)return 'Array Size must be 3–100.';
 if(!Number.isInteger(data.targetSelect)||data.targetSelect<1||data.targetSelect>100)return 'Choose a valid number target.';
 if(data.goalSelect&&!state.linkedGoals.some(g=>g.id===data.goalSelect))return 'Choose a linked IEP Goal from Student Profile.';
 return null;
}
function readCloud(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 if(!Object.prototype.hasOwnProperty.call(raw,'benchmarkSelect')||!Object.prototype.hasOwnProperty.call(raw,'targetSelect'))return null;
 const out={};for(const id of fields)if(Object.prototype.hasOwnProperty.call(raw,id))out[id]=raw[id];
 if(Object.prototype.hasOwnProperty.call(raw,'customDistractor'))out.doThisSelect=raw.customDistractor;
 return out;
}
function setSavedAvailable(raw){
 state.cloud=readCloud(raw);
 restoreBtn.hidden=!state.cloud;
 if(state.cloud)updateStatus('COMPASS has saved settings for this student. Use Restore Saved Setup if needed.','info');
}
function makeNonce(){
 if(typeof crypto==='undefined'||typeof crypto.getRandomValues!=='function')return '';
 const raw=Array.from(crypto.getRandomValues(new Uint8Array(16)));
 raw[6]=(raw[6]&15)|64;raw[8]=(raw[8]&63)|128;
 const hex=raw.map(n=>n.toString(16).padStart(2,'0')).join('');
 return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
}
function saveToHost(data){
 const nonce=makeNonce();if(!nonce||!uuidRE.test(nonce))return Promise.reject(Error('Secure setup request could not be created.'));
 if(!uuidRE.test(state.assignmentId)||!state.parentOrigin)return Promise.reject(Error('Open 1:1 Count from a student’s Program Hub to save.'));
 if(window.parent===window)return Promise.reject(Error('Open the student’s COMPASS program to save.'));
 return new Promise((resolve,reject)=>{
  const assignmentId=state.assignmentId,expectedOrigin=state.parentOrigin;
  let completed=false;
  const cleanup=()=>{
   completed=true;window.removeEventListener('message',receive);
   clearTimeout(timeout);
  };
  const receive=ev=>{
   if(completed||ev.source!==window.parent||ev.origin!==expectedOrigin)return;
   const message=ev.data||{};
   if(message.type!=='compass-save-setup-response'||message.nonce!==nonce||
     String(message.assignment_id)!==assignmentId)return;
   cleanup();message.ok===true&&message.saved===true?resolve(message):reject(Error(String(message.error||'COMPASS did not confirm the setup save.').slice(0,220)));
  };
  const timeout=setTimeout(()=>{cleanup();reject(Error('COMPASS did not respond. Check your connection and retry.'));},16000);
  window.addEventListener('message',receive);
  window.parent.postMessage({type:'compass-save-setup-request',assignment_id:assignmentId,nonce,setup:data},expectedOrigin);
 });
}
async function save(){
 if(state.pending)return;
 const snapshot=setupSnapshot(),issue=validateSave(snapshot);
 if(issue){updateStatus(issue,'error');return}
 saveBtn.disabled=true;saveBtn.textContent='Saving…';
 updateStatus('Saving this student’s program settings…','pending');
 const p=saveToHost(snapshot);state.pending=p;
 try{
  const response=await p;
  setSavedAvailable(response.programSetup||snapshot);
  state.dirty=false;
  updateStatus('Saved to COMPASS for this student.','success');
 }catch(error){updateStatus('Not saved: '+String(error.message||error),'error')}
 finally{
  state.pending=null;saveBtn.disabled=false;saveBtn.textContent='Save Setup';
 }
}
function restore(){
 const cloud=state.cloud;if(!cloud)return;
 if(state.pending){updateStatus('Finish saving before restoring.','error');return}
 // Never overwrite an existing unfinished teaching run with restored configuration.
 if($('runPage')?.classList.contains('active')){updateStatus('Return to Program Setup before restoring settings.','error');return}
 const select=(id)=>{
  const control=$(id),raw=cloud[id];
  if(!control||raw===undefined)return;
  if(control.tagName==='SELECT'){
   const value=id==='goalSelect'?(state.linkedGoals.find(g=>g.id===raw)?.title||String(raw)):String(raw);
   if(![...control.options].some(o=>o.value===value))return;
   control.value=value;
  }else control.value=String(raw);
  control.dispatchEvent(new Event('change',{bubbles:true}));
 };
 // Native benchmark handler rebuilds target options. Select target immediately afterwards.
 select('benchmarkSelect');select('targetSelect');
 for(const id of fields.filter(x=>x!=='benchmarkSelect'&&x!=='targetSelect'))select(id);
 if(cloud.doThisSelect!==undefined)select('doThisSelect');
 updateStatus('Saved setup restored. Review mastery rules and press Save Setup to confirm.','info');
 state.dirty=true;
}
saveBtn.addEventListener('click',save);
restoreBtn.addEventListener('click',restore);
fold.addEventListener('toggle',()=>{toolbar.classList.toggle('is-collapsed',!fold.open)});
for(const id of fields)$(id)?.addEventListener('change',()=>{
 state.dirty=true;if(status.dataset.status==='success')updateStatus('Settings changed. Select Save Setup to save changes to COMPASS.','info');
});
window.addEventListener('message',ev=>{
 if(ev.source!==window.parent||window.parent===window)return;
 const m=ev.data||{};
 if(m.type!=='COMPASS_DEMO_V18_CONTEXT'||!uuidRE.test(m.assignment_id||''))return;
 if(!m.student?.id||typeof m.student.id!=='string')return;
 if(state.assignmentId&&state.assignmentId!==m.assignment_id){state.cloud=null;restoreBtn.hidden=true;}
 state.assignmentId=m.assignment_id;state.studentId=m.student.id;state.parentOrigin=ev.origin;
 state.linkedGoals=(Array.isArray(m.linkedGoalOptions)?m.linkedGoalOptions:[])
  .filter(g=>g&&uuidRE.test(String(g.id||''))&&typeof g.title==='string'&&g.title.trim())
  .map(g=>({id:String(g.id),title:g.title.trim()}));
 setSavedAvailable(m.programSetup);
 state.loaded=true;
});
window.COMPASS_COUNTING_SETUP_SAVE={
 version:'1.0',ready:true,getState:()=>({
  installed:true,assignmentAvailable:!!state.assignmentId,cloudAvailable:!!state.cloud,
  pending:!!state.pending,dirty:state.dirty,snapshot:setupSnapshot(),status:status.dataset.status||'info'
 })
};
})();