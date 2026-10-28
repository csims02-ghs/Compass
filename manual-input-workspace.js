/* COMPASS Manual Input · student/assignment-linked, audited manual records + existing live history.
   No service-role credentials, no direct edits to recorded live sessions. */
(()=>{
'use strict';
const by=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const option=(value,label)=>'<option value="'+esc(value)+'">'+esc(label)+'</option>';
const uniq=a=>[...new Set(a.filter(Boolean))];
const dateNow=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const timeNow=()=>new Date().toTimeString().slice(0,5);
const status=(msg,error=false,where='miFeedback')=>{const el=by(where);if(el){el.textContent=msg;el.classList.toggle('error',error)}};
const context=()=>window.COMPASS_MANUAL_BRIDGE?.context()||{};
const table=name=>{if(!window.COMPASS_MANUAL_BRIDGE)throw Error('Sign in to COMPASS to access student records.');return window.COMPASS_MANUAL_BRIDGE.query(name)};
const query=async q=>{const r=await q;if(r.error)throw r.error;return r.data||[]};
const st={students:[],assignments:[],catalog:[],profiles:[],goals:[],selectedStudent:'',selectedProgram:'',selectedResponse:'',editingId:'',manual:[],live:[],rows:[],visible:[],page:0,limit:8,filters:{},loading:false,ready:false,selected:new Set(),cache:new Map(),showGraph:false};
const student=sid=>st.students.find(s=>s.id===sid);
const studentName=s=>String(s?.display_label||s?.student_code||'Student');
const assignment=id=>st.assignments.find(a=>a.id===id);
const program=id=>st.catalog.find(p=>p.id===id);
const programName=id=>program(assignment(id)?.program_id)?.program_name||'Program';
const canManage=r=>!!r&&r.origin==='manual'&&(r.created_by===context().userId||['platform_admin','district_admin','school_admin','bcba'].includes(context().role));
const mappingResponse=r=>{const x=String(r||'').toLowerCase();if(['independent_correct','correct','independent','target_correct'].includes(x))return'independent';if(['prompted_correct','prompted','prompt'].includes(x))return'prompted';if(['incorrect','target_incorrect','distractor_incorrect'].includes(x))return'incorrect';if(['no_response','no-response'].includes(x))return'no_response';if(['na','no_valid_opportunity'].includes(x))return'na';return x||'unknown'};
const countBehaviors=b=>{if(!b)return{};if(Array.isArray(b))return Object.fromEntries(b.map(x=>[String(x),1]));if(typeof b==='object')return Object.fromEntries(Object.entries(b).filter(([,v])=>Number(v)>0).map(([k,v])=>[k,Number(v)||1]));return{}};
async function pages(make,chunk=500){const output=[];for(let i=0;i<200;i++){const rows=await query(make(i*chunk,(i+1)*chunk-1));output.push(...rows);if(rows.length<chunk)return output}throw Error('History exceeds the safe loading limit (100,000 records). Please narrow the date range; data has not been deleted.')}
async function getMany(tableName,column,ids,fields,orderField){const result=[];for(let i=0;i<ids.length;i+=30){const group=ids.slice(i,i+30);const rows=await pages((start,end)=>table(tableName).select(fields).in(column,group).order(orderField,{ascending:false}).range(start,end));result.push(...rows)}return result}
function fillSelect(id,items,placeholder){const el=by(id);if(!el)return;const previous=el.value;el.innerHTML=option('',placeholder)+items.map(x=>option(x[0],x[1])).join('');if([...el.options].some(x=>x.value===previous))el.value=previous}
function assignedPrograms(sid){const byProgram=new Map();for(const a of st.assignments.filter(x=>x.student_id===sid)){const current=byProgram.get(a.program_id);if(!current||current.status!=='active'&&a.status==='active')byProgram.set(a.program_id,a)}return[...byProgram.values()].sort((a,b)=>String(programName(a.id)).localeCompare(programName(b.id)))}
function currentTargetMeta(){const a=assignment(by('miProgram').value);return program(a?.program_id)?.program_config||{}}
function benchmarkItems(cfg){let raw=cfg.benchmark_sets||cfg.benchmarks||cfg.levels||[];if(!Array.isArray(raw))raw=[];return raw.map((x,i)=>[String(i+1),typeof x==='string'?x:String(x.label||x.name||x.title||'Benchmark '+(i+1))])}
function targetRows(cfg){const arr=Array.isArray(cfg.targets)?cfg.targets:Array.isArray(cfg.direction_bank)?cfg.direction_bank:[];return arr.map((t,i)=>({key:String(t.target_key||t.key||t.id||i+1),name:String(t.name||t.target_name||t.label||'Target '+(i+1)),benchmark:String(t.metadata?.benchmark||t.metadata?.benchmark_number||t.benchmark||t.metadata?.level||'')}))}
async function loadTargetOptions(){const a=assignment(by('miProgram').value);const cfg=currentTargetMeta(),b=by('miBenchmark').value;
let targets=targetRows(cfg);
if(a&&targets.length===0){try{const rows=await query(table('compass_programming_targets').select('target_key,target_name,metadata').eq('program_id',a.program_id).order('display_order'));targets=rows.map(t=>({key:String(t.target_key||t.target_name),name:t.target_name,benchmark:String(t.metadata?.benchmark||'')}))}catch(e){status('Targets could not load: '+e.message,true);}}
const valid=targets.filter(t=>!b||!t.benchmark||t.benchmark===b);
fillSelect('miTarget',valid.map(t=>[t.key,t.name]),'Select target');
by('miTarget').required=true;
}
function renderBehaviors(){
const s=student(st.selectedStudent),names=uniq([...(s?.selected_behaviors||[]),...(s?.secondary_behaviors||[])]).slice(0,8);
by('miBehaviors').innerHTML=names.length?names.map(n=>'<label class="mi-behavior"><input type="checkbox" value="'+esc(n)+'"><span>'+esc(n)+'</span></label>').join(''):'<span class="mi-description">No behaviors assigned to this student.</span>';
}
function syncProvider(){
 const sel=by('miProvider'),manual=sel.value==='manual',input=by('miProviderManual');
 input.classList.toggle('visible',manual);input.required=manual;input.disabled=!manual;
 if(!manual)input.value='';
}
function renderProviders(){
const ctx=context(),list=st.profiles.filter(p=>p.full_name).map(p=>[p.id,p.full_name]);
if(ctx.userId&&!list.some(x=>x[0]===ctx.userId))list.unshift([ctx.userId,ctx.providerName||'Current Provider']);
fillSelect('miProvider',list.concat([['manual','Manual Enter']]),'Select provider');
syncProvider();
}
function renderStudents(){
const options=st.students.slice().sort((a,b)=>studentName(a).localeCompare(studentName(b))).map(s=>[s.id,studentName(s)]);
fillSelect('miStudent',options,'Select student');
fillSelect('miFilterStudent',options,'Select student');
}
function renderPrograms(){
const all=assignedPrograms(st.selectedStudent),active=all.filter(x=>x.status==='active');
fillSelect('miProgram',active.map(a=>[a.id,programName(a.id)]),'Select assigned program');
by('miProgram').disabled=!active.length;
fillSelect('miFilterProgram',all.map(a=>[a.program_id,programName(a.id)]),'All Programs');
}
async function selectProgram(){
const cfg=currentTargetMeta(),bs=benchmarkItems(cfg);
fillSelect('miBenchmark',bs,'All / Not specified');
await loadTargetOptions();
}
async function loadMetadata(){
const ctx=context();if(!ctx.userId)throw Error('Sign in to COMPASS before entering student data.');
st.students=await query(table('students').select('id,student_code,display_label,selected_behaviors,secondary_behaviors,status').order('display_label'));
st.assignments=await query(table('student_compass_programs').select('id,student_id,program_id,status,assigned_date,display_order').order('assigned_date',{ascending:false}));
const ids=uniq(st.assignments.map(x=>x.program_id));st.catalog=ids.length?await getMany('compass_programming_programs','id',ids,'id,program_name,program_config','created_at'):[];
try{st.profiles=await query(table('profiles').select('id,full_name,role').eq('active',true).order('full_name'))}catch(e){st.profiles=[]}
renderStudents();renderProviders();
by('miDate').value=dateNow();by('miTime').value=timeNow();
if(ctx.currentStudentId&&st.students.some(s=>s.id===ctx.currentStudentId)){by('miStudent').value=ctx.currentStudentId;await selectStudent(ctx.currentStudentId)}
}
async function selectStudent(sid){
 if(st.loading)return;
 st.selectedStudent=sid||'';
 by('miStudent').value=sid||'';by('miFilterStudent').value=sid||'';
 st.selectedProgram='';st.manual=[];st.live=[];st.rows=[];st.selected.clear();
 renderPrograms();renderBehaviors();renderFilters();renderRows();
 if(!sid)return;
 try{st.goals=await query(table('student_iep_goals').select('id,title,goal_area').eq('student_id',sid).order('created_at',{ascending:false}));}
 catch(e){st.goals=[]}
 fillSelect('miGoal',st.goals.map(g=>[g.id,g.title||g.goal_area||'IEP Goal']),'Not linked');
 const active=assignedPrograms(sid).find(a=>a.status==='active');if(active){by('miProgram').value=active.id;await selectProgram();}
 await loadHistory();
}
function historicalSession(s,a){
const behaviors=countBehaviors(s.behavior_counts),when=String(s.started_at||s.created_at||s.session_date||'');
const count=Number(s.trials_total||0),independent=Number(s.targets_correct||0),prompted=Number(s.prompted_correct||0),incorrect=Number(s.incorrect||0);
return {id:'session:'+s.id,origin:'session',student_id:a.student_id,student_compass_program_id:a.id,program_id:a.program_id,event_date:s.session_date,event_time:when.includes('T')?when.slice(11,16):'',provider_name:st.profiles.find(p=>p.id===s.staff_id)?.full_name||'Recorded staff',target_name:s.target_name||'Session summary',target_key:s.target_key||'',benchmark_key:'',trial_number:count,trial_type:'',response:'summary',prompt_level:'',behavior_counts:behaviors,notes:s.notes||'',session_id:s.id,totals:{count,independent,prompted,incorrect,no_response:Number(s.no_response||0)},source:'Recorded session'};
}
function trialRecord(t,a,sessions){
const parent=sessions.get(t.session_id),when=String(t.occurred_at||t.created_at||parent?.started_at||'');
const behavior=countBehaviors(t.behavior_counts);
return {id:'trial:'+t.id,origin:'live',student_id:a.student_id,student_compass_program_id:a.id,program_id:a.program_id,event_date:when.slice(0,10)||parent?.session_date||'',event_time:when.includes('T')?when.slice(11,16):'',provider_name:st.profiles.find(p=>p.id===parent?.staff_id)?.full_name||'Recorded staff',target_name:t.target_name||t.target_key||parent?.target_name||'Target',target_key:t.target_key,benchmark_key:t.benchmark_key,trial_number:t.trial_number,trial_type:t.trial_type||'T',response:mappingResponse(t.result),prompt_level:t.prompt_level||'None',behavior_counts:behavior,notes:parent?.notes||'',session_id:t.session_id,source:t.source||'Live session',goal_id:t.goal_id};
}
function manualRecord(m){return {...m,id:'manual:'+m.id,originalId:m.id,origin:'manual',program_id:assignment(m.student_compass_program_id)?.program_id,source:'Manual entry',response:m.response,behavior_counts:countBehaviors(m.behavior_counts)}}
async function loadHistory(){
 const sid=st.selectedStudent;if(!sid)return;
 st.loading=true;status('Loading full authorized student history…',false,'miHistoryStatus');
 try{
 const ids=st.assignments.filter(a=>a.student_id===sid).map(a=>a.id);
 const [manual,sessions,trials]=await Promise.all([
  pages((a,b)=>table('compass_manual_trial_entries').select('*').eq('student_id',sid).is('deleted_at',null).order('event_date',{ascending:false}).range(a,b)),
  ids.length?getMany('compass_program_sessions','student_compass_program_id',ids,'id,student_compass_program_id,staff_id,session_date,target_name,target_key,trials_total,targets_correct,prompted_correct,incorrect,no_response,behavior_counts,notes,started_at,created_at','created_at'):Promise.resolve([]),
  ids.length?getMany('compass_trial_events','student_compass_program_id',ids,'id,session_id,student_compass_program_id,trial_number,trial_type,target_key,target_name,benchmark_key,goal_id,result,prompt_level,behavior_counts,occurred_at,source,created_at','occurred_at'):Promise.resolve([])
 ]);
 if(st.selectedStudent!==sid)return;
 st.manual=manual;const map=new Map(sessions.map(s=>[s.id,s]));
 const trialsBySession=new Set(trials.map(t=>t.session_id));
 const base=trials.map(t=>trialRecord(t,assignment(t.student_compass_program_id)||{id:t.student_compass_program_id,student_id:sid},map));
 const residual=sessions.filter(s=>!trialsBySession.has(s.id)).map(s=>historicalSession(s,assignment(s.student_compass_program_id)||{id:s.student_compass_program_id,student_id:sid}));
 st.live=[...base,...residual];st.rows=[...manual.map(manualRecord),...st.live];
 renderFilters();renderRows();status('All available COMPASS trial and session records loaded.',false,'miHistoryStatus');
 }catch(e){status('Unable to load full history: '+e.message,true,'miHistoryStatus');st.rows=[];renderRows();}
 finally{st.loading=false}
}

/* UI_AND_ACTIONS */
})();
