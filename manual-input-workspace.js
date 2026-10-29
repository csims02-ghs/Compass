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
const spec=(Array.isArray(cfg.benchmark_sets)?cfg.benchmark_sets:[])[Math.max(0,Number(b)-1)];
const hasRange=!!(b&&spec&&Number.isFinite(Number(spec.start))&&Number.isFinite(Number(spec.end)));
const valid=targets.filter((t,i)=>{
 if(!b)return true;
 if(hasRange){const number=Number(t.key);return Number.isFinite(number)&&number>=Number(spec.start)&&number<=Number(spec.end)||
   (!Number.isFinite(number)&&i+1>=Number(spec.start)&&i+1<=Number(spec.end));}
 return !t.benchmark||t.benchmark===b;
});
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
 st.selectedStudent=sid||'';
 by('miStudent').value=sid||'';by('miFilterStudent').value=sid||'';
 st.selectedProgram='';st.manual=[];st.live=[];st.rows=[];st.selected.clear();st.filters={};st.page=0;by('miFilterProgram').value='';by('miFilterFrom').value='';by('miFilterTo').value='';by('miFilterProvider').value='';
 renderPrograms();renderBehaviors();renderFilters();renderRows();
 if(!sid)return;
 try{const goals=await query(table('student_iep_goals').select('id,title,goal_area').eq('student_id',sid).order('created_at',{ascending:false}));if(st.selectedStudent!==sid)return;st.goals=goals;}
 catch(e){if(st.selectedStudent!==sid)return;st.goals=[]}
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
function behaviorObservation(b,sid){
 const n=Math.max(0,Number(b.count||0));
 return {id:'behavior:'+b.id,origin:'behavior_only',student_id:sid,student_compass_program_id:'',program_id:'',
  program_label:'Unassigned behavior observation',event_date:b.data_date,event_time:'',provider_name:st.profiles.find(p=>p.id===b.collected_by)?.full_name||'Recorded staff',
  target_name:'Behavior · '+String(b.data_type||'Observation'),target_key:'',benchmark_key:'',trial_number:null,trial_type:'',
  response:'behavior_only',prompt_level:'',behavior_counts:n>0?{[b.behavior_name||'Observed behavior']:n}:{},notes:b.notes||'',source:'Behavior observation'};
}
async function loadHistory(){
 const sid=st.selectedStudent;if(!sid)return;
 st.loading=true;status('Loading full authorized student history…',false,'miHistoryStatus');
 try{
 const ids=st.assignments.filter(a=>a.student_id===sid).map(a=>a.id);
 const [manual,sessions,trials,behaviorOnly]=await Promise.all([
  pages((a,b)=>table('compass_manual_trial_entries').select('*').eq('student_id',sid).is('deleted_at',null).order('event_date',{ascending:false}).range(a,b)),
  ids.length?getMany('compass_program_sessions','student_compass_program_id',ids,'id,student_compass_program_id,staff_id,session_date,target_name,target_key,trials_total,targets_correct,prompted_correct,incorrect,no_response,behavior_counts,notes,started_at,created_at','created_at'):Promise.resolve([]),
  ids.length?getMany('compass_trial_events','student_compass_program_id',ids,'id,session_id,student_compass_program_id,trial_number,trial_type,target_key,target_name,benchmark_key,goal_id,result,prompt_level,behavior_counts,occurred_at,source,created_at','occurred_at'):Promise.resolve([]),
 pages((a,b)=>table('student_behavior_data').select('id,student_id,data_type,behavior_name,data_date,count,notes,collected_by').eq('student_id',sid).order('data_date',{ascending:false}).range(a,b))
 ]);
 if(st.selectedStudent!==sid)return;
 st.manual=manual;const map=new Map(sessions.map(s=>[s.id,s]));
 const trialsBySession=new Set(trials.map(t=>t.session_id));
 const base=trials.map(t=>trialRecord(t,assignment(t.student_compass_program_id)||{id:t.student_compass_program_id,student_id:sid},map));
 const residual=sessions.filter(s=>!trialsBySession.has(s.id)).map(s=>historicalSession(s,assignment(s.student_compass_program_id)||{id:s.student_compass_program_id,student_id:sid}));
 st.live=[...base,...residual,...behaviorOnly.map(b=>behaviorObservation(b,sid))];st.rows=[...manual.map(manualRecord),...st.live];
 renderFilters();renderRows();status('All available COMPASS trial and session records loaded.',false,'miHistoryStatus');
 }catch(e){status('Unable to load full history: '+e.message,true,'miHistoryStatus');st.rows=[];renderRows();}
 finally{st.loading=false}
}


function renderFilters(){
 const p=by('miFilterProgram'),old=p.value;
 const programs=assignedPrograms(st.selectedStudent).map(a=>[a.program_id,programName(a.id)]);
 fillSelect('miFilterProgram',programs,'All Programs');
 if([...p.options].some(o=>o.value===old))p.value=old;
 const provider=by('miFilterProvider'),choice=provider.value;
 const names=uniq(st.rows.map(x=>x.provider_name||'Recorded staff')).sort((a,b)=>a.localeCompare(b));
 fillSelect('miFilterProvider',names.map(n=>[n,n]),'All Providers');
 if([...provider.options].some(o=>o.value===choice))provider.value=choice;
}
function activeFilters(){return{program:by('miFilterProgram').value,from:by('miFilterFrom').value,to:by('miFilterTo').value,provider:by('miFilterProvider').value}}
function displayRows(){
 const filters=st.filters||{};
 const entries=st.rows.filter(r=>r.student_id===st.selectedStudent)
 .filter(r=>!filters.program||r.program_id===filters.program)
 .filter(r=>!filters.from||r.event_date>=filters.from)
 .filter(r=>!filters.to||r.event_date<=filters.to)
 .filter(r=>!filters.provider||r.provider_name===filters.provider);
 return entries.sort((a,b)=>String(b.event_date||'').localeCompare(String(a.event_date||''))||String(b.event_time||'').localeCompare(String(a.event_time||''))||String(b.id).localeCompare(String(a.id)));
}
function behaviorLabels(value){
 const entries=Object.entries(countBehaviors(value));
 if(!entries.length)return '<span class="mi-chip">None</span>';
 return entries.slice(0,2).map(([name,count])=>'<span class="mi-chip behavior">'+esc(name)+(count>1?' ×'+count:'')+'</span>').join(' ')+(entries.length>2?'<span class="mi-chip">+'+(entries.length-2)+'</span>':'');
}
function responseLabel(row){
 if(row.response==='summary')return'<span class="mi-chip">Session Summary</span>';
 const labels={independent:'Independent',prompted:'Prompted',incorrect:'Incorrect',no_response:'No Response',na:'N/A'};
 const t=labels[row.response]||row.response||'Not recorded';return'<span class="mi-chip '+esc(row.response)+'">'+esc(t)+'</span>';
}
function historyTr(row){
 const editable=canManage(row),id=esc(row.id);
 const checkbox=row.origin==='manual'?'<input type="checkbox" data-mi-select="'+id+'" aria-label="Select manual entry" '+(st.selected.has(row.originalId)?'checked':'')+(editable?'':' disabled')+'>':'';
 const actions=row.origin==='manual'?'<button class="mi-link-action" type="button" data-mi-edit="'+id+'" aria-label="Edit manual entry" '+(editable?'':'disabled')+'>✎</button> <button class="mi-link-action delete" type="button" data-mi-delete="'+id+'" aria-label="Delete manual entry" '+(editable?'':'disabled')+'>▤</button>':'<span title="Recorded session data is read-only here">Read-only</span>';
 const source=row.origin==='manual'?'<span class="mi-chip manual">Manual: '+esc(row.provider_name||'')+'</span>':'<span class="mi-chip">'+esc(row.source||'Recorded')+'</span>';
 return '<tr>'+
 '<td>'+checkbox+'</td><td>'+esc(row.event_date||'—')+'</td><td>'+esc(row.event_time||'—')+'</td>'+
 '<td>'+esc(studentName(student(row.student_id)))+'</td><td>'+esc(row.program_label||programName(row.student_compass_program_id))+'</td>'+
 '<td>'+esc(row.target_name||'—')+'</td><td>'+esc(row.response==='summary'?'—':row.trial_number||1)+'</td>'+
 '<td>'+responseLabel(row)+'</td><td>'+esc(row.prompt_level||'N/A')+'</td><td>'+behaviorLabels(row.behavior_counts)+'</td>'+
 '<td>'+esc(row.provider_name||'Recorded staff')+'</td><td>'+source+'</td>'+
 '<td class="mi-notes-col" title="'+esc(row.notes||'')+'">'+esc(row.notes||'—')+'</td>'+
 '<td style="white-space:nowrap">'+actions+'</td></tr>';
}
function metricTotals(rows){
 const totals={trials:0,independent:0,prompted:0,incorrect:0,no_response:0,behaviors:{}};
 for(const r of rows){
  if(r.response==='summary'){const m=r.totals||{};totals.trials+=Number(m.count||0);totals.independent+=Number(m.independent||0);totals.prompted+=Number(m.prompted||0);totals.incorrect+=Number(m.incorrect||0);totals.no_response+=Number(m.no_response||0)}
  else if(['independent','prompted','incorrect','no_response'].includes(r.response)){totals.trials++;totals[r.response]++;}
  for(const [name,n] of Object.entries(countBehaviors(r.behavior_counts)))totals.behaviors[name]=(totals.behaviors[name]||0)+n;
 }return totals;
}
function renderSummary(rows){
 const t=metricTotals(rows);
 const stats=[['Total Trials',t.trials,'▥',''],['Independent',t.independent,'✓',t.trials?Math.round(t.independent/t.trials*100)+'%':'0%'],['Prompted',t.prompted,'◉',t.trials?Math.round(t.prompted/t.trials*100)+'%':'0%'],['Incorrect',t.incorrect,'✕',t.trials?Math.round(t.incorrect/t.trials*100)+'%':'0%']];
 by('miStats').innerHTML=stats.map(([name,count,icon,pct])=>'<div class="mi-stat"><span class="mi-stat-icon">'+icon+'</span><div><div class="mi-stat-label">'+esc(name)+'</div><div class="mi-stat-count">'+count+'</div><div class="mi-stat-pct">'+esc(pct)+'</div></div></div>').join('');
 const s=student(st.selectedStudent),assigned=uniq([...(s?.selected_behaviors||[]),...(s?.secondary_behaviors||[])]);
 const names=uniq([...assigned,...Object.keys(t.behaviors)]);if(!names.length)names.push('No behavior targets');
 by('miBehaviorStats').innerHTML=names.map(name=>{const count=t.behaviors[name]||0;const pct=t.trials?Math.round(count/t.trials*100):0;return '<div class="mi-behavior-stat"><span class="mi-name">'+esc(name)+'</span><strong>'+count+'</strong> <span>'+pct+'% of trials</span></div>'}).join('');
 const selectedProgram=by('miFilterProgram').value;
 const prog=selectedProgram?program(selectedProgram)?.program_name:'All Programs';
 by('miSummaryTitle').textContent='Selected Range Summary ('+studentName(s)+' · '+(prog||'All Programs')+')';
}
function renderGraph(rows){
 const div=by('miGraph');if(!st.showGraph){div.hidden=true;return}div.hidden=false;
 const days=new Map();
 for(const r of rows){const key=r.event_date;if(!key||!['summary','independent','prompted','incorrect','no_response'].includes(r.response))continue;const prev=days.get(key)||{total:0,correct:0};if(r.response==='summary'){prev.total+=Number(r.totals?.count||0);prev.correct+=Number(r.totals?.independent||0)}else{prev.total++;if(r.response==='independent')prev.correct++;}days.set(key,prev)}
 const points=[...days].sort((a,b)=>a[0].localeCompare(b[0]));
 if(!points.length){div.textContent='No scored trials in this range to graph.';return}
 const w=680,h=195,pad=26,step=points.length>1?(w-2*pad)/(points.length-1):0;
 const xy=points.map(([d,v],i)=>({x:pad+i*step,y:h-pad-(v.total?v.correct/v.total:0)*(h-pad*2),date:d,n:v.total,rate:v.total?Math.round(v.correct/v.total*100):0}));
 const path=xy.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
 const circles=xy.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="#1b6fee"><title>'+esc(p.date)+': '+p.rate+'% independent · '+p.n+' trials</title></circle>').join('');
 div.innerHTML='<strong>Independent response rate by date · '+points.length+' dates</strong><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Daily independent response percentage" style="width:100%;max-height:235px"><path d="M26 26V169H654" fill="none" stroke="#b1cee9"/><path d="'+path+'" fill="none" stroke="#1a70eb" stroke-width="3"/>'+circles+'<text x="28" y="20" font-size="12" fill="#315f96">100%</text><text x="28" y="185" font-size="12" fill="#315f96">0%</text></svg><div class="mi-source-note">'+esc(points[0][0])+' – '+esc(points[points.length-1][0])+' · Manual and live recorded responses</div>';
}
function renderRows(){
 st.visible=displayRows();const n=st.visible.length;st.page=Math.max(0,Math.min(st.page,Math.ceil(n/st.limit)-1));
 const start=st.page*st.limit,rows=st.visible.slice(start,start+st.limit);
 by('miHistoryRows').innerHTML=rows.length?rows.map(historyTr).join(''):'<tr><td colspan="14" class="mi-empty">No entries found for this student and range.</td></tr>';
 by('miRowCount').textContent=n?'Showing '+(start+1)+'–'+(start+rows.length)+' of '+n+' entries':'0 entries';
 by('miPageNumber').textContent=String(st.page+1);by('miPrev').disabled=st.page===0;by('miNext').disabled=start+st.limit>=n;
 const selectable=rows.filter(canManage).filter(r=>r.origin==='manual');by('miSelectAll').checked=selectable.length>0&&selectable.every(r=>st.selected.has(r.originalId));
 by('miDeleteSelected').disabled=!st.selected.size;
 renderSummary(st.visible);renderGraph(st.visible);
}
function setResponse(response){
 st.selectedResponse=response;
 by('miNoResponse').checked=response==='no_response';by('miNa').checked=response==='na';
 document.querySelectorAll('#miForm [data-response]').forEach(b=>{const yes=b.dataset.response===response;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes))});
 if(response!=='prompted')by('miPrompt').value='None';
}
function clearForm(keepContext=true){
 const sid=by('miStudent').value,pid=by('miProgram').value,provider=by('miProvider').value,providerManual=by('miProviderManual').value,date=by('miDate').value;
 by('miForm').reset();st.editingId='';st.selectedResponse='';
 by('miSave').textContent='Add Entry';by('miDate').value=keepContext?date:dateNow();by('miTime').value=timeNow();
 if(keepContext){by('miStudent').value=sid;by('miProgram').value=pid;by('miProvider').value=provider;syncProvider();if(provider==='manual')by('miProviderManual').value=providerManual;}
 document.querySelectorAll('#miForm [data-response]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false')});
 document.querySelectorAll('#miBehaviors input[type=checkbox]').forEach(i=>i.checked=false);
 by('miTrial').value='1';status('');
}
async function saveEntry(){
 if(st.loading||!st.selectedStudent)return status('Select the student first.',true);
 const sid=by('miStudent').value,aid=by('miProgram').value,a=assignment(aid);
 if(!a||a.student_id!==sid||a.status!=='active'&&!st.editingId)return status('Select an active assigned program for this student.',true);
 const target=by('miTarget'),targetName=target.selectedOptions[0]?.textContent?.trim()||'';
 const providerChoice=by('miProvider').value,isManual=providerChoice==='manual';
 const providerName=(isManual?by('miProviderManual').value:st.profiles.find(p=>p.id===providerChoice)?.full_name||(providerChoice===context().userId?context().providerName:'')).trim();
 if(!providerName)return status('Select a provider, or choose Manual Enter and type their name.',true);
 if(!target.value||!targetName||!Array.from(target.options).some(o=>o.value===target.value))
   return status('Select a target belonging to the assigned program.',true);
 const response=st.selectedResponse;if(!response)return status('Select the student response.',true);
 const prompt=by('miPrompt').value;if(response==='prompted'&&prompt==='None')return status('Select the prompt level used.',true);
 if(!by('miDate').value)return status('Select the data collection date.',true);
 const goals=st.goals;const gid=by('miGoal').value;if(gid&&!goals.some(g=>g.id===gid))return status('Choose an IEP goal for the selected student.',true);
 const counts=Object.fromEntries([...by('miBehaviors').querySelectorAll('input[type=checkbox]:checked')].map(i=>[i.value,1]));
 const values={event_date:by('miDate').value,event_time:by('miTime').value||null,provider_user_id:!isManual&&providerChoice?providerChoice:null,provider_name:providerName,provider_entry_type:isManual?'manual':'directory',location_setting:by('miLocation').value.trim(),service_type:by('miService').value,chain_type:by('miChain').value,benchmark_key:by('miBenchmark').value,target_key:target.value,target_name:targetName,goal_id:gid||null,trial_number:Number(by('miTrial').value)||1,trial_type:by('miTrialType').value,response,prompt_level:response==='prompted'?prompt:'None',behavior_counts:counts,notes:by('miNotes').value.trim()};
 const button=by('miSave');button.disabled=true;status(st.editingId?'Updating entry…':'Saving entry…');
 try{
  let answer;
  if(st.editingId){
   const old=st.manual.find(x=>x.id===st.editingId);if(!old||old.student_id!==sid||old.student_compass_program_id!==aid)throw Error('Student or program cannot be changed when editing; create a new entry instead.');
   answer=await query(table('compass_manual_trial_entries').update(values).eq('id',st.editingId).eq('student_id',sid).select('id'));
  }else{
   answer=await query(table('compass_manual_trial_entries').insert({...values,student_id:sid,student_compass_program_id:aid,created_by:context().userId}).select('id'));
  }
  if(answer.length!==1)throw Error('Save was not acknowledged. Check your permissions and retry.');
  const message=st.editingId?'Entry updated with audit history.':'Manual trial recorded for the selected student and program.';
  clearForm();status(message);
  window.COMPASS_MANUAL_BRIDGE?.notify();await loadHistory();
  status(message);
 }catch(e){status('Could not save: '+e.message,true)}finally{button.disabled=false}
}
async function editEntry(id){
 const row=st.rows.find(r=>r.id===id);if(!canManage(row))return status('Only your authorized manual records can be edited.',true);
 if(row.student_id!==st.selectedStudent){await selectStudent(row.student_id)}
 const a=assignment(row.student_compass_program_id);if(!a)return status('Original assigned program not available.',true);
 if(![...by('miProgram').options].some(o=>o.value===a.id)){by('miProgram').add(new Option(programName(a.id)+' (historical)',a.id))}
 by('miProgram').value=a.id;await selectProgram();
 st.editingId=row.originalId;by('miDate').value=row.event_date||dateNow();by('miTime').value=row.event_time||'';
 by('miLocation').value=row.location_setting||'';
 if([...by('miService').options].some(o=>o.value===row.service_type))by('miService').value=row.service_type;
 if([...by('miChain').options].some(o=>o.value===row.chain_type))by('miChain').value=row.chain_type;
 if([...by('miBenchmark').options].some(o=>o.value===row.benchmark_key))by('miBenchmark').value=row.benchmark_key;
 await loadTargetOptions();
 if(![...by('miTarget').options].some(o=>o.value===row.target_key))by('miTarget').add(new Option(row.target_name,row.target_key));
 by('miTarget').value=row.target_key;
 by('miGoal').value=row.goal_id||'';by('miTrial').value=row.trial_number||1;by('miTrialType').value=row.trial_type||'T';setResponse(row.response);
 by('miPrompt').value=row.prompt_level||'None';by('miNotes').value=row.notes||'';
 const sel=by('miProvider');
 const exists=row.provider_user_id&&[...sel.options].some(o=>o.value===row.provider_user_id);
 sel.value=exists?row.provider_user_id:'manual';syncProvider();if(!exists)by('miProviderManual').value=row.provider_name||'';
 for(const c of by('miBehaviors').querySelectorAll('input[type=checkbox]'))c.checked=!!countBehaviors(row.behavior_counts)[c.value];
 by('miSave').textContent='Save Changes';status('Editing manual entry. Student and original assignment are locked for record integrity.');by('miForm').scrollIntoView({behavior:'smooth',block:'start'});
}
async function deleteEntries(ids){
 const authorized=uniq(ids).map(id=>st.manual.find(x=>x.id===id)).filter(x=>x&&!x.deleted_at&&canManage(manualRecord(x)));
 if(!authorized.length)return status('No editable manual entries were selected.',true,'miHistoryStatus');
 if(!window.confirm('Delete '+authorized.length+' manual entr'+(authorized.length===1?'y':'ies')+'? Live-session records are never deleted. Deleted entries retain an audit record.'))return;
 status('Deleting selected manual entries…',false,'miHistoryStatus');
 try{
  for(const row of authorized){const out=await query(table('compass_manual_trial_entries').update({deleted_at:new Date().toISOString()}).eq('id',row.id).eq('student_id',st.selectedStudent).is('deleted_at',null).select('id'));if(out.length!==1)throw Error('Permission denied or entry already deleted: '+row.id);}
  st.selected.clear();await loadHistory();status(authorized.length+' manual entr'+(authorized.length===1?'y':'ies')+' deleted with audit retained.',false,'miHistoryStatus');window.COMPASS_MANUAL_BRIDGE?.notify();
 }catch(e){status('Unable to delete every entry: '+e.message,true,'miHistoryStatus');await loadHistory();}
}
function attach(){
 if(st.ready)return;st.ready=true;
 by('miStudent').addEventListener('change',e=>selectStudent(e.target.value));
 by('miFilterStudent').addEventListener('change',e=>selectStudent(e.target.value));
 by('miProgram').addEventListener('change',async()=>{await selectProgram();by('miFilterProgram').value=assignment(by('miProgram').value)?.program_id||'';st.filters=activeFilters();st.page=0;renderRows()});
 by('miBenchmark').addEventListener('change',loadTargetOptions);
 by('miProvider').addEventListener('change',syncProvider);
 by('miForm').addEventListener('submit',e=>{e.preventDefault();saveEntry()});
 by('miClear').addEventListener('click',()=>clearForm());
 by('miClearBehaviors').addEventListener('click',()=>by('miBehaviors').querySelectorAll('input[type=checkbox]').forEach(i=>i.checked=false));
 for(const b of document.querySelectorAll('#miForm [data-response]'))b.addEventListener('click',()=>setResponse(b.dataset.response));
 by('miNoResponse').addEventListener('change',e=>setResponse(e.target.checked?'no_response':''));
 by('miNa').addEventListener('change',e=>setResponse(e.target.checked?'na':''));
 by('miApplyFilter').addEventListener('click',()=>{st.filters=activeFilters();st.page=0;st.selected.clear();renderRows()});
 by('miClearFilters').addEventListener('click',()=>{by('miFilterProgram').value='';by('miFilterFrom').value='';by('miFilterTo').value='';by('miFilterProvider').value='';st.filters={};st.page=0;st.selected.clear();renderRows()});
 by('miPrev').addEventListener('click',()=>{st.page=Math.max(0,st.page-1);renderRows()});
 by('miNext').addEventListener('click',()=>{st.page++;renderRows()});
 by('miGraphToggle').addEventListener('click',()=>{st.showGraph=!st.showGraph;by('miGraphToggle').textContent=st.showGraph?'Hide Graph':'⌁ Show Graph';by('miGraphToggle').setAttribute('aria-expanded',String(st.showGraph));renderGraph(st.visible)});
 by('miSelectAll').addEventListener('change',e=>{for(const r of st.visible.slice(st.page*st.limit,(st.page+1)*st.limit).filter(canManage)){if(e.target.checked)st.selected.add(r.originalId);else st.selected.delete(r.originalId)}renderRows()});
 by('miDeleteSelected').addEventListener('click',()=>deleteEntries([...st.selected]));
 by('miHistoryRows').addEventListener('change',e=>{const id=e.target.dataset.miSelect;if(!id)return;const row=st.rows.find(x=>x.id===id);if(!canManage(row))return;if(e.target.checked)st.selected.add(row.originalId);else st.selected.delete(row.originalId);renderRows()});
 by('miHistoryRows').addEventListener('click',e=>{const edit=e.target.closest('[data-mi-edit]'),del=e.target.closest('[data-mi-delete]');if(edit)editEntry(edit.dataset.miEdit);if(del){const row=st.rows.find(x=>x.id===del.dataset.miDelete);if(row)deleteEntries([row.originalId]);}});
}
async function start(){
 if(!by('sessionPanelManual')||!window.COMPASS_MANUAL_BRIDGE)return;
 attach();if(st.loading)return;
 try{await loadMetadata();status('Select a student and their assigned program to enter data.');}
 catch(e){status('Manual Input cannot load authorized student data: '+e.message,true)}
}
function boot(){const tab=by('sessionTabManual');if(!tab)return;tab.addEventListener('click',()=>{if(!st.ready)start()});if(tab.getAttribute('aria-selected')==='true')start();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

})();
