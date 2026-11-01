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
const st={students:[],assignments:[],catalog:[],profiles:[],goals:[],selectedStudent:'',selectedProgram:'',selectedResponse:'',editingId:'',manual:[],live:[],rows:[],visible:[],page:0,limit:8,filters:{},loading:false,ready:false,selected:new Set(),cache:new Map(),showGraph:false,chainScores:[]};
const student=sid=>st.students.find(s=>s.id===sid);
const studentName=s=>String(s?.display_label||s?.student_code||'Student');
const assignment=id=>st.assignments.find(a=>a.id===id);
const program=id=>st.catalog.find(p=>p.id===id);
const programName=id=>program(assignment(id)?.program_id)?.program_name||'Program';
const canManage=r=>!!r&&r.origin==='manual'&&(r.created_by===context().userId||['platform_admin','district_admin','school_admin','bcba'].includes(context().role));
const canArchiveTrial=r=>!!r&&r.origin==='live'&&(r.staff_id===context().userId||['platform_admin','district_admin','school_admin','bcba'].includes(context().role));
const canArchiveSession=r=>!!r&&r.origin==='session'&&(r.staff_id===context().userId||['platform_admin','district_admin','school_admin','bcba'].includes(context().role));
const canArchiveBehavior=r=>!!r&&r.origin==='behavior_only'&&(r.collected_by===context().userId||['platform_admin','district_admin','school_admin','bcba'].includes(context().role));
const canRemove=r=>canManage(r)||canArchiveTrial(r)||canArchiveSession(r)||canArchiveBehavior(r);
const displayDate=value=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));return m?m[2]+'/'+m[3]+'/'+m[1]:String(value||'—')};
const mappingResponse=r=>{const x=String(r||'').toLowerCase();if(['independent_correct','correct','independent','target_correct'].includes(x))return'independent';if(['prompted_correct','prompted','prompt'].includes(x))return'prompted';if(['incorrect','target_incorrect','distractor_incorrect'].includes(x))return'incorrect';if(['no_response','no-response'].includes(x))return'no_response';if(['na','no_valid_opportunity'].includes(x))return'na';return x||'unknown'};
const countBehaviors=b=>{if(!b)return{};if(Array.isArray(b))return Object.fromEntries(b.map(x=>[String(x),1]));if(typeof b==='object')return Object.fromEntries(Object.entries(b).filter(([,v])=>Number(v)>0).map(([k,v])=>[k,Number(v)||1]));return{}};
async function pages(make,chunk=500){const output=[];for(let i=0;i<200;i++){const rows=await query(make(i*chunk,(i+1)*chunk-1));output.push(...rows);if(rows.length<chunk)return output}throw Error('History exceeds the safe loading limit (100,000 records). Please narrow the date range; data has not been deleted.')}
async function getMany(tableName,column,ids,fields,orderField){const result=[];for(let i=0;i<ids.length;i+=30){const group=ids.slice(i,i+30);const rows=await pages((start,end)=>table(tableName).select(fields).in(column,group).order(orderField,{ascending:false}).range(start,end));result.push(...rows)}return result}
function fillSelect(id,items,placeholder){const el=by(id);if(!el)return;const previous=el.value;el.innerHTML=option('',placeholder)+items.map(x=>option(x[0],x[1])).join('');if([...el.options].some(x=>x.value===previous))el.value=previous}
function assignedPrograms(sid){const byProgram=new Map();for(const a of st.assignments.filter(x=>x.student_id===sid)){const current=byProgram.get(a.program_id);if(!current||current.status!=='active'&&a.status==='active')byProgram.set(a.program_id,a)}return[...byProgram.values()].sort((a,b)=>String(programName(a.id)).localeCompare(programName(b.id)))}
function currentTargetMeta(){const a=assignment(by('miProgram').value);return program(a?.program_id)?.program_config||{}}
function benchmarkItems(cfg){let raw=cfg.benchmark_sets||cfg.benchmarks||cfg.levels||[];if(!Array.isArray(raw))raw=[];return raw.map((x,i)=>[String(i+1),typeof x==='string'?x:String(x.label||x.name||x.title||'Benchmark '+(i+1))])}
function targetRows(cfg){const arr=Array.isArray(cfg.targets)?cfg.targets:Array.isArray(cfg.direction_bank)?cfg.direction_bank:[];return arr.map((t,i)=>({key:String(t.target_key||t.key||t.id||i+1),name:String(t.name||t.target_name||t.label||'Target '+(i+1)),benchmark:String(t.metadata?.benchmark||t.metadata?.benchmark_number||t.benchmark||t.metadata?.level||'')}))}

/* A complete chain is one auditable manual record, with individually scored T/D steps.
   The actual steps are sourced from the assigned program, not a global guessed pattern. */
function parseChain(raw){
 const str=(Array.isArray(raw)?raw.join(','):String(raw||'')).replace(/[\s,]/g,'').toUpperCase();
 return /^[TD]{1,50}$/.test(str)?str.split(''):[];
}
function chainOptions(cfg){
 const raw=[...(Array.isArray(cfg.trial_chains)?cfg.trial_chains:[]),...(Array.isArray(cfg.dti_chains)?cfg.dti_chains:[])];
 const entries=[];const seen=new Set();
 function add(label,pattern){
  const steps=parseChain(pattern);
  if(!steps.length)return;
  const key=String(label||'Custom chain').replace(/^\d+\.\s*/,'').trim();
  const normalized=key.toLowerCase().replace(/\s*[·—-]\s*.*$/,'').trim();
  if(seen.has(normalized))return;
  seen.add(normalized);entries.push({label:key,value:steps.join(',')});
 }
 add('Default',cfg.default_chain||'T,T,D,T,D,D,T,T');
 raw.forEach((entry,i)=>add(entry.label||entry.name||entry.title||'Chain '+(i+1),entry.value||entry.pattern||entry.steps||entry.sequence));
 if(!entries.some(x=>/short/i.test(x.label)))add('Short','T,T,T');
 if(!entries.some(x=>/iep chain/i.test(x.label)))add('IEP Chain','T,T,T,T,T');
 if(!entries.some(x=>/single/i.test(x.label)))add('Single','T');
 const priority=x=>/default/i.test(x.label)?0:/^momentum\b/i.test(x.label)?1:/short/i.test(x.label)?2:/iep chain/i.test(x.label)?3:10;
 return entries.map((x,i)=>({...x,index:i})).sort((a,b)=>priority(a)-priority(b)||a.index-b.index);
}
function refreshChainOptions(){
 const el=by('miChain'),cfg=currentTargetMeta(),previous=el.value,options=chainOptions(cfg);
 el.innerHTML=options.map(x=>option(x.value,x.label)).join('')+
   option('NET','NET / Natural Opportunity (single trial only)')+
   option('probe','Probe Benchmark (single trial only)');
 const match=options.find(x=>x.value===previous);
 el.value=match?match.value:options[0]?.value||'';
 st.chainScores=[];renderChain();
}
function chainSteps(){
 return parseChain(by('miChain')?.value);
}
function renderChain(){
 const active=by('miTrialType')?.value==='chain',panel=by('miChainScoring');
 if(!panel)return;
 panel.hidden=!active;
 by('miSingleResponse').hidden=active;
 by('miTrial').closest('.mi-field').hidden=active;
 by('miPrompt').closest('.mi-field').hidden=active;
 if(!active)return;
 const steps=chainSteps(),previous=st.chainScores;
 if(steps.join('')!==previous.map(x=>x.type).join(''))
  st.chainScores=steps.map(type=>({type,response:'',prompt:'None'}));
 if(!steps.length){
  by('miChainPreview').textContent='Select a valid DTI trial chain for this program.';
  by('miChainSummary').textContent='A complete target/distractor sequence is required.';
  return;
 }
 const prompts=['None','Gestural','Verbal','Model','Visual','Partial Physical','Full Physical','Other'];
 const choices=[['independent','✓ Correct'],['prompted','◉ Prompted (Incorrect)'],['incorrect','✕ Incorrect'],['no_response','— No Response']];
 by('miChainPreview').innerHTML=st.chainScores.map((step,i)=>{
  const buttons=choices.map(([value,label])=>'<button type="button" class="mi-chain-result" data-chain-step="'+i+'" data-chain-response="'+value+'" aria-pressed="'+(step.response===value)+'">'+label+'</button>').join('');
  const prompt=step.response==='prompted'?'<select aria-label="Prompt level for step '+(i+1)+'" data-chain-prompt="'+i+'">'+prompts.map(p=>'<option value="'+esc(p)+'" '+(step.prompt===p?'selected':'')+'>'+esc(p)+'</option>').join('')+'</select>':'';
  return '<div class="mi-chain-step '+(step.type==='D'?'distractor':'target')+'"><div class="mi-chain-step-head"><span class="mi-chain-tile">'+step.type+'</span><strong>Step '+(i+1)+' · '+(step.type==='T'?'Target':'Distractor')+'</strong><span>'+esc(step.response?({'independent':'Correct','prompted':'Prompted · Incorrect','incorrect':'Incorrect','no_response':'No Response'}[step.response]||step.response):'Awaiting score')+'</span></div><div class="mi-chain-scoring-buttons">'+buttons+'</div>'+prompt+'</div>';
 }).join('');
 const targets=st.chainScores.filter(x=>x.type==='T'),distractors=st.chainScores.filter(x=>x.type==='D');
 const correct=targets.filter(x=>x.response==='independent').length;
 const complete=st.chainScores.filter(x=>x.response).length;
 const accuracy=targets.length?Math.round(correct/targets.length*100):0;
 by('miChainSummary').innerHTML='<span class="mi-chain-score">'+correct+'/'+targets.length+' Correct · '+accuracy+'%</span> '+targets.length+' targets · '+distractors.length+' distractors · '+complete+'/'+steps.length+' steps scored'+(complete===steps.length?' · Ready to save':' <span class="mi-chain-incomplete">· Finish all steps</span>');
}
function validChain(){
 const steps=chainSteps();
 if(!steps.length||steps.length!==st.chainScores.length)return 'Select a valid full trial chain.';
 if(st.chainScores.some((step,i)=>step.type!==steps[i]||!['independent','prompted','incorrect','no_response'].includes(step.response)))
  return 'Score every target and distractor before saving.';
 if(st.chainScores.some(s=>s.response==='prompted'&&(!s.prompt||s.prompt==='None')))
  return 'Choose a prompt level for every prompted chain step.';
 return '';
}
function storedChain(){
 return st.chainScores.map((step,i)=>({trial_number:i+1,trial_type:step.type,response:step.response,prompt_level:step.response==='prompted'?step.prompt:'None'}));
}
function scoredTargets(row){
 const steps=Array.isArray(row.chain_steps)?row.chain_steps:[];
 return steps.filter(x=>x.trial_type==='T'&&['independent','prompted','incorrect','no_response'].includes(x.response));
}

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
/* Behavior frequency counters are independent of target/distractor scoring.
   Keep historical behavior names when editing so an old record cannot silently lose data. */
function renderBehaviors(previous={}){
 const s=student(st.selectedStudent);
 const assigned=uniq([...(s?.selected_behaviors||[]),...(s?.secondary_behaviors||[])]).slice(0,8);
 const counts=countBehaviors(previous);
 const names=uniq([...assigned,...Object.keys(counts)]);
 by('miBehaviors').innerHTML=names.length?names.map(name=>{
  const n=Math.min(9999,Math.max(0,Math.floor(Number(counts[name])||0)));
  return '<div class="mi-behavior'+(n>0?' recorded':'')+'" data-mi-behavior-name="'+esc(name)+'">'+
   '<span class="mi-behavior-name">'+esc(name)+'</span>'+
   '<div class="mi-behavior-counter" role="group" aria-label="'+esc(name)+' frequency">'+
   '<button type="button" class="mi-behavior-adjust" data-mi-behavior-delta="-1" aria-label="Decrease '+esc(name)+' frequency" '+(n===0?'disabled':'')+'>−</button>'+
   '<output class="mi-behavior-count" aria-label="'+esc(name)+' occurrences" aria-live="polite">'+n+'</output>'+
   '<button type="button" class="mi-behavior-adjust" data-mi-behavior-delta="1" aria-label="Increase '+esc(name)+' frequency" '+(n===9999?'disabled':'')+'>+</button>'+
   '</div></div>';
 }).join(''):'<span class="mi-description">No behaviors assigned to this student.</span>';
}
function behaviorCountsFromForm(){
 return Object.fromEntries([...by('miBehaviors').querySelectorAll('[data-mi-behavior-name]')]
  .map(row=>[row.dataset.miBehaviorName,Number(row.querySelector('output')?.textContent)||0])
  .filter(([name,n])=>name&&Number.isInteger(n)&&n>0&&n<=9999));
}
function adjustBehavior(e){
 const button=e.target.closest('[data-mi-behavior-delta]');
 if(!button||!by('miBehaviors').contains(button))return;
 const row=button.closest('[data-mi-behavior-name]'),out=row?.querySelector('output');
 if(!out)return;
 const next=Math.min(9999,Math.max(0,Number(out.textContent||0)+Number(button.dataset.miBehaviorDelta)));
 out.textContent=String(next);
 row.classList.toggle('recorded',next>0);
 row.querySelector('[data-mi-behavior-delta="-1"]').disabled=next===0;
 row.querySelector('[data-mi-behavior-delta="1"]').disabled=next===9999;
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
refreshChainOptions();
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
return {id:'session:'+s.id,originalId:s.id,origin:'session',staff_id:s.staff_id||null,student_id:a.student_id,student_compass_program_id:a.id,program_id:a.program_id,event_date:s.session_date,event_time:when.includes('T')?when.slice(11,16):'',provider_name:st.profiles.find(p=>p.id===s.staff_id)?.full_name||'Recorded staff',target_name:s.target_name||'Session summary',target_key:s.target_key||'',benchmark_key:'',trial_number:count,trial_type:'',response:'summary',prompt_level:'',behavior_counts:behaviors,notes:s.notes||'',session_id:s.id,totals:{count,independent,prompted,incorrect,no_response:Number(s.no_response||0)},source:'Recorded session'};
}
/* Display one row per saved program session; events remain individually stored.
   Session behavior_counts are the authoritative run totals (do not sum
   potentially cumulative behavior snapshots from individual trials). */
function consolidatedSession(s,a,activeTrials){
 const row=historicalSession(s,a);
 const trials=activeTrials.filter(t=>t.session_id===s.id);
 const targets=trials.filter(t=>t.trial_type==='T');
 if(targets.length){
  row.totals={
   count:targets.length,
   independent:targets.filter(t=>mappingResponse(t.result)==='independent').length,
   incorrect:targets.filter(t=>mappingResponse(t.result)==='incorrect').length,
   prompted:targets.filter(t=>mappingResponse(t.result)==='prompted').length,
   no_response:targets.filter(t=>mappingResponse(t.result)==='no_response'||mappingResponse(t.result)==='na').length
  };
 }
 row.trial_ids=trials.map(t=>t.id);
 row.trial_event_count=trials.length;
 row.behavior_counts=countBehaviors(s.behavior_counts);
 row.source='COMPASS session';
 const first=trials.find(t=>t.occurred_at||t.created_at);
 if(first){
  const ts=String(first.occurred_at||first.created_at);
  if(ts.includes('T'))row.event_time=ts.slice(11,16);
 }
 if(!s.target_name&&targets.length)row.target_name=targets[0].target_name||'—';
 return row;
}
function trialRecord(t,a,sessions){
const parent=sessions.get(t.session_id),when=String(t.occurred_at||t.created_at||parent?.started_at||'');
const behavior=countBehaviors(t.behavior_counts);
return {id:'trial:'+t.id,originalId:t.id,origin:'live',staff_id:parent?.staff_id||null,student_id:a.student_id,student_compass_program_id:a.id,program_id:a.program_id,event_date:when.slice(0,10)||parent?.session_date||'',event_time:when.includes('T')?when.slice(11,16):'',provider_name:st.profiles.find(p=>p.id===parent?.staff_id)?.full_name||'Recorded staff',target_name:t.target_name||t.target_key||parent?.target_name||'Target',target_key:t.target_key,benchmark_key:t.benchmark_key,trial_number:t.trial_number,trial_type:t.trial_type||'T',response:mappingResponse(t.result),prompt_level:t.prompt_level||'None',behavior_counts:behavior,notes:parent?.notes||'',session_id:t.session_id,source:t.source||'Live session',goal_id:t.goal_id};
}
function manualRecord(m){return {...m,id:'manual:'+m.id,originalId:m.id,origin:'manual',program_id:assignment(m.student_compass_program_id)?.program_id,source:'Manual entry',response:m.response,behavior_counts:countBehaviors(m.behavior_counts)}}
function behaviorObservation(b,sid){
 const n=Math.max(0,Number(b.count||0));
 return {id:'behavior:'+b.id,originalId:b.id,collected_by:b.collected_by||null,origin:'behavior_only',student_id:sid,student_compass_program_id:'',program_id:'',
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
  ids.length?getMany('compass_program_sessions','student_compass_program_id',ids,'id,student_compass_program_id,staff_id,session_date,target_name,target_key,trials_total,targets_correct,prompted_correct,incorrect,no_response,behavior_counts,notes,started_at,created_at,deleted_at','created_at'):Promise.resolve([]),
  ids.length?getMany('compass_trial_events','student_compass_program_id',ids,'id,session_id,student_compass_program_id,trial_number,trial_type,target_key,target_name,benchmark_key,goal_id,result,prompt_level,behavior_counts,occurred_at,source,created_at,deleted_at','occurred_at'):Promise.resolve([]),
 pages((a,b)=>table('student_behavior_data').select('id,student_id,data_type,behavior_name,data_date,count,notes,collected_by,deleted_at').eq('student_id',sid).is('deleted_at',null).order('data_date',{ascending:false}).range(a,b))
 ]);
 if(st.selectedStudent!==sid)return;
 st.manual=manual;const activeSessions=sessions.filter(s=>!s.deleted_at);const activeTrials=trials.filter(t=>!t.deleted_at);const map=new Map(activeSessions.map(s=>[s.id,s]));
 // Aggregate by immutable COMPASS session ID, never by clock minute or target.
 // This avoids combining unrelated teaching runs that happened at the same time.
 const sessionsGrouped=activeSessions.map(s=>consolidatedSession(s,assignment(s.student_compass_program_id)||{id:s.student_compass_program_id,student_id:sid},activeTrials));
 st.live=[...sessionsGrouped,...behaviorOnly.map(b=>behaviorObservation(b,sid))];st.rows=[...manual.map(manualRecord),...st.live];
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
 if(!entries.length)return '<span class="mi-chip mi-none">None</span>';
 return '<span class="mi-behavior-pills">'+entries.map(([name,count])=>
  '<span class="mi-chip behavior">'+esc(name)+' ('+esc(count)+')</span>').join('')+'</span>';
}
function targetMetrics(row){
 if(row.response==='summary'){
  const t=row.totals||{};
  const total=Math.max(0,Number(t.count)||0),correct=Math.max(0,Number(t.independent)||0),
        noResponse=Math.max(0,Number(t.no_response)||0);
  return {total,correct,valid:Math.max(0,total-noResponse)};
 }
 if(row.origin==='manual'&&Array.isArray(row.chain_steps)&&row.chain_steps.length){
  const ts=scoredTargets(row),correct=ts.filter(x=>x.response==='independent').length;
  return {total:ts.length,correct,valid:ts.filter(x=>x.response!=='no_response').length};
 }
 if(row.origin==='manual'&&row.trial_type!=='D'&&row.response!=='na'){
  const valid=row.response!=='no_response'?1:0;
  return {total:1,correct:row.response==='independent'?1:0,valid};
 }
 return {total:0,correct:0,valid:0};
}
function historyTr(row){
 const removable=canRemove(row),id=esc(row.id),metrics=targetMetrics(row);
 const checkLabel=row.origin==='session'?'program session':row.origin==='manual'?'manual entry':'behavior observation';
 const checkbox='<input type="checkbox" data-mi-select="'+id+'" aria-label="Select '+esc(checkLabel)+'" '+(st.selected.has(row.id)?'checked ':'')+(removable?'':'disabled title="Not authorized to archive this record"')+'>';
 const actions=row.origin==='manual'
 ?'<button class="mi-link-action" type="button" data-mi-edit="'+id+'" aria-label="Edit manual entry" '+(removable?'':'disabled')+'>✎</button> <button class="mi-link-action delete" type="button" data-mi-delete="'+id+'" aria-label="Archive manual entry" '+(removable?'':'disabled')+'>▤</button>'
 :row.origin==='session'
 ?'<button class="mi-link-action delete" type="button" data-mi-delete="'+id+'" aria-label="Archive entire program session" '+(removable?'':'disabled')+'>▤</button>'
 :'<button class="mi-link-action delete" type="button" data-mi-delete="'+id+'" aria-label="Archive behavior observation" '+(removable?'':'disabled')+'>▤</button>';
 const targets=metrics.total?metrics.correct+'/'+metrics.total+' Correct':'—';
 const percentage=metrics.valid?Math.round(metrics.correct/metrics.valid*100)+'%':'—';
 return '<tr title="'+esc(row.notes||'')+'">'+
 '<td>'+checkbox+'</td><td class="mi-record-date">'+esc(displayDate(row.event_date))+'</td>'+
 '<td class="mi-record-time">'+esc(row.event_time||'—')+'</td>'+
 '<td>'+esc(studentName(student(row.student_id)))+'</td><td>'+esc(row.program_label||programName(row.student_compass_program_id))+'</td>'+
 '<td>'+esc(row.target_name||'—')+'</td>'+
 '<td class="mi-target-score">'+esc(targets)+'</td><td class="mi-accuracy">'+esc(percentage)+'</td>'+
 '<td>'+behaviorLabels(row.behavior_counts)+'</td>'+
 '<td>'+esc(row.provider_name||'Recorded staff')+'</td>'+
 '<td class="mi-record-actions">'+actions+'</td></tr>';
}
function metricTotals(rows){
 const totals={trials:0,independent:0,prompted:0,incorrect:0,no_response:0,behaviors:{}};
 for(const r of rows){
  if(r.origin==='manual'&&Array.isArray(r.chain_steps)&&r.chain_steps.length){
   for(const step of scoredTargets(r)){totals.trials++;totals[step.response]++;}
  }
  else if(r.response==='summary'){const m=r.totals||{};totals.trials+=Number(m.count||0);totals.independent+=Number(m.independent||0);totals.prompted+=Number(m.prompted||0);totals.incorrect+=Number(m.incorrect||0);totals.no_response+=Number(m.no_response||0)}
  else if(['independent','prompted','incorrect','no_response'].includes(r.response)){totals.trials++;totals[r.response]++;}
  for(const [name,n] of Object.entries(countBehaviors(r.behavior_counts)))totals.behaviors[name]=(totals.behaviors[name]||0)+n;
 }return totals;
}
function renderSummary(rows){
 const t=metricTotals(rows);
 // Clinical scoring: any prompted response counts as incorrect, but remains
 // identifiable as prompted so staff can review the level of assistance.
 const incorrect=t.incorrect+t.prompted;
 const stats=[['Total Targets',t.trials,'▥',''],['Independent',t.independent,'✓',t.trials?Math.round(t.independent/t.trials*100)+'%':'0%'],['Prompted (Incorrect)',t.prompted,'◉',t.trials?Math.round(t.prompted/t.trials*100)+'%':'0%'],['Incorrect (incl. Prompted)',incorrect,'✕',t.trials?Math.round(incorrect/t.trials*100)+'%':'0%']];
 by('miStats').innerHTML=stats.map(([name,count,icon,pct])=>'<div class="mi-stat"><span class="mi-stat-icon">'+icon+'</span><div><div class="mi-stat-label">'+esc(name)+'</div><div class="mi-stat-count">'+count+'</div><div class="mi-stat-pct">'+esc(pct)+'</div></div></div>').join('');
 const s=student(st.selectedStudent),assigned=uniq([...(s?.selected_behaviors||[]),...(s?.secondary_behaviors||[])]);
 const names=uniq([...assigned,...Object.keys(t.behaviors)]);if(!names.length)names.push('No behavior targets');
 by('miBehaviorStats').innerHTML=names.map(name=>{const count=t.behaviors[name]||0;return '<div class="mi-behavior-stat"><span class="mi-name">'+esc(name)+'</span><strong>'+count+'</strong> <span>occurrences</span></div>'}).join('');
 const selectedProgram=by('miFilterProgram').value;
 const prog=selectedProgram?program(selectedProgram)?.program_name:'All Programs';
 by('miSummaryTitle').textContent='Selected Range Summary ('+studentName(s)+' · '+(prog||'All Programs')+')';
}
function renderGraph(rows){
 const div=by('miGraph');if(!st.showGraph){div.hidden=true;return}div.hidden=false;
 const days=new Map();
 for(const r of rows){const key=r.event_date;if(!key)continue;const prev=days.get(key)||{total:0,correct:0};if(r.origin==='manual'&&Array.isArray(r.chain_steps)&&r.chain_steps.length){const ts=scoredTargets(r);prev.total+=ts.length;prev.correct+=ts.filter(x=>x.response==='independent').length;}
 else if(r.response==='summary'){prev.total+=Number(r.totals?.count||0);prev.correct+=Number(r.totals?.independent||0)}else if(['independent','prompted','incorrect','no_response'].includes(r.response)){prev.total++;if(r.response==='independent')prev.correct++;}else continue;days.set(key,prev)}
 const points=[...days].sort((a,b)=>a[0].localeCompare(b[0]));
 if(!points.length){div.textContent='No scored trials in this range to graph.';return}
 const w=680,h=195,pad=26,step=points.length>1?(w-2*pad)/(points.length-1):0;
 const xy=points.map(([d,v],i)=>({x:pad+i*step,y:h-pad-(v.total?v.correct/v.total:0)*(h-pad*2),date:d,n:v.total,rate:v.total?Math.round(v.correct/v.total*100):0}));
 const path=xy.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
 const circles=xy.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="#1b6fee"><title>'+esc(displayDate(p.date))+': '+p.rate+'% independent · '+p.n+' trials</title></circle>').join('');
 div.innerHTML='<strong>Independent response rate by date · '+points.length+' dates</strong><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Daily independent response percentage" style="width:100%;max-height:235px"><path d="M26 26V169H654" fill="none" stroke="#b1cee9"/><path d="'+path+'" fill="none" stroke="#1a70eb" stroke-width="3"/>'+circles+'<text x="28" y="20" font-size="12" fill="#315f96">100%</text><text x="28" y="185" font-size="12" fill="#315f96">0%</text></svg><div class="mi-source-note">'+esc(displayDate(points[0][0]))+' – '+esc(displayDate(points[points.length-1][0]))+' · Manual and live recorded responses</div>';
}
function renderRows(){
 st.visible=displayRows();const n=st.visible.length;st.page=Math.max(0,Math.min(st.page,Math.ceil(n/st.limit)-1));
 const start=st.page*st.limit,rows=st.visible.slice(start,start+st.limit);
 by('miHistoryRows').innerHTML=rows.length?rows.map(historyTr).join(''):'<tr><td colspan="11" class="mi-empty">No entries found for this student and range.</td></tr>';
 by('miRowCount').textContent=n?'Showing '+(start+1)+'–'+(start+rows.length)+' of '+n+' entries':'0 entries';
 by('miPageNumber').textContent=String(st.page+1);by('miPrev').disabled=st.page===0;by('miNext').disabled=start+st.limit>=n;
 const selectable=rows.filter(canRemove);by('miSelectAll').checked=selectable.length>0&&selectable.every(r=>st.selected.has(r.id));by('miSelectAll').indeterminate=selectable.some(r=>st.selected.has(r.id))&&!by('miSelectAll').checked;by('miSelectAll').disabled=!selectable.length;
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
 renderBehaviors();
 by('miTrial').value='1';st.chainScores=[];renderChain();status('');
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
 const fullChain=by('miTrialType').value==='chain';
 if(fullChain){const issue=validChain();if(issue)return status(issue,true)}
 const firstTarget=fullChain?st.chainScores.find(x=>x.type==='T'):null;
 const response=fullChain?(firstTarget?.response||'incorrect'):st.selectedResponse;
 if(!response)return status('Select the student response.',true);
 const prompt=by('miPrompt').value;if(!fullChain&&response==='prompted'&&prompt==='None')return status('Select the prompt level used.',true);
 if(!by('miDate').value)return status('Select the data collection date.',true);
 const goals=st.goals;const gid=by('miGoal').value;if(gid&&!goals.some(g=>g.id===gid))return status('Choose an IEP goal for the selected student.',true);
 const counts=behaviorCountsFromForm();
 const values={event_date:by('miDate').value,event_time:by('miTime').value||null,provider_user_id:!isManual&&providerChoice?providerChoice:null,provider_name:providerName,provider_entry_type:isManual?'manual':'directory',location_setting:by('miLocation').value.trim(),service_type:by('miService').value,chain_type:by('miChain').value,benchmark_key:by('miBenchmark').value,target_key:target.value,target_name:targetName,goal_id:gid||null,trial_number:fullChain?1:Number(by('miTrial').value)||1,trial_type:fullChain?'T':by('miTrialType').value,response,prompt_level:fullChain?'None':response==='prompted'?prompt:'None',chain_steps:fullChain?storedChain():null,behavior_counts:counts,notes:by('miNotes').value.trim()};
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
 by('miGoal').value=row.goal_id||'';by('miTrial').value=row.trial_number||1;
 const savedChain=Array.isArray(row.chain_steps)&&row.chain_steps.length;
 by('miTrialType').value=savedChain?'chain':row.trial_type||'T';
 if(savedChain){
  st.chainScores=row.chain_steps.map(x=>({type:x.trial_type,response:x.response,prompt:x.prompt_level||'None'}));
  if(![...by('miChain').options].some(o=>o.value===row.chain_type))by('miChain').add(new Option('Saved chain',row.chain_type));
  by('miChain').value=row.chain_type;
 }
 renderChain();setResponse(savedChain?'':row.response);
 by('miPrompt').value=row.prompt_level||'None';by('miNotes').value=row.notes||'';
 const sel=by('miProvider');
 const exists=row.provider_user_id&&[...sel.options].some(o=>o.value===row.provider_user_id);
 sel.value=exists?row.provider_user_id:'manual';syncProvider();if(!exists)by('miProviderManual').value=row.provider_name||'';
 renderBehaviors(row.behavior_counts);
 by('miSave').textContent='Save Changes';status('Editing manual entry. Student and original assignment are locked for record integrity.');by('miForm').scrollIntoView({behavior:'smooth',block:'start'});
}
async function deleteEntries(ids){
 const chosen=uniq(ids).map(id=>st.rows.find(x=>x.id===id)).filter(canRemove);
 if(!chosen.length)return status('No authorized entries were selected. Check your permissions for these students.',true,'miHistoryStatus');
 const manual=chosen.filter(r=>r.origin==='manual'),trials=chosen.filter(r=>r.origin==='live'),sessions=chosen.filter(r=>r.origin==='session'),behaviors=chosen.filter(r=>r.origin==='behavior_only');
 const includedTrials=sessions.reduce((n,r)=>n+(r.trial_event_count||0),0);
 const message='Archive '+chosen.length+' selected record'+(chosen.length===1?'':'s')+' ('+manual.length+' manual, '+sessions.length+' program sessions, '+includedTrials+' session trial events, '+behaviors.length+' behavior observations)?\n\nArchived records are removed from active data displays, retained in the audit history, and cannot be restored from this screen.';
 if(!window.confirm(message))return;
 status('Archiving '+chosen.length+' selected records…',false,'miHistoryStatus');
 let done=0;
 try{
  for(const row of chosen){
   if(row.origin==='manual'){
    const out=await query(table('compass_manual_trial_entries').update({deleted_at:new Date().toISOString()}).eq('id',row.originalId).eq('student_id',st.selectedStudent).is('deleted_at',null).select('id'));
    if(out.length!==1)throw Error('The manual record was not archived. Check your permissions.');
   }else if(row.origin==='live'){
    const {error,count}=await table('compass_trial_events')
      .update({deleted_at:new Date().toISOString(),deleted_by:context().userId},{count:'exact'})
      .eq('id',row.originalId).eq('student_compass_program_id',row.student_compass_program_id).is('deleted_at',null);
    if(error)throw error;
    if(count!==1)throw Error('Recorded trial was not archived. Check your permission to correct this session.');
   }else if(row.origin==='session'){
    // The database blocks deleting a session with live trial events. Archive
    // its recorded trials first, retaining each audit record and updating
    // counts, then archive the parent session. Do not silently skip failures.
    if((row.trial_ids||[]).length){
      const {error,count}=await table('compass_trial_events')
        .update({deleted_at:new Date().toISOString(),deleted_by:context().userId},{count:'exact'})
        .eq('session_id',row.originalId).eq('student_compass_program_id',row.student_compass_program_id)
        .is('deleted_at',null);
      if(error)throw error;
      if(count!==row.trial_ids.length)throw Error('Some trial events were not archived; session remains available for review.');
    }
    const {error,count}=await table('compass_program_sessions')
      .update({deleted_at:new Date().toISOString(),deleted_by:context().userId},{count:'exact'})
      .eq('id',row.originalId).eq('student_compass_program_id',row.student_compass_program_id).is('deleted_at',null);
    if(error)throw error;
    if(count!==1)throw Error('Program session was not archived. Check access and remaining trial records.');
   }else if(row.origin==='behavior_only'){
    const {error,count}=await table('student_behavior_data')
      .update({deleted_at:new Date().toISOString(),deleted_by:context().userId},{count:'exact'})
      .eq('id',row.originalId).eq('student_id',st.selectedStudent).is('deleted_at',null);
    if(error)throw error;
    if(count!==1)throw Error('Behavior observation was not archived. Check your access.');
   }
   done++;
  }
  st.selected.clear();await loadHistory();
  status(done+' record'+(done===1?'':'s')+' archived with audit history retained.',false,'miHistoryStatus');
  window.COMPASS_MANUAL_BRIDGE?.notify();
 }catch(e){
  st.selected.clear();await loadHistory();
  status('Archived '+done+' of '+chosen.length+' records. Unable to complete the remainder: '+e.message,true,'miHistoryStatus');
  if(done)window.COMPASS_MANUAL_BRIDGE?.notify();
 }
}
function attach(){
 if(st.ready)return;st.ready=true;
 by('miStudent').addEventListener('change',e=>selectStudent(e.target.value));
 by('miFilterStudent').addEventListener('change',e=>selectStudent(e.target.value));
 by('miProgram').addEventListener('change',async()=>{await selectProgram();by('miFilterProgram').value=assignment(by('miProgram').value)?.program_id||'';st.filters=activeFilters();st.page=0;renderRows()});
 by('miBenchmark').addEventListener('change',loadTargetOptions);
 by('miChain').addEventListener('change',()=>{st.chainScores=[];renderChain()});
 by('miTrialType').addEventListener('change',()=>{st.chainScores=[];renderChain()});
 by('miTarget').addEventListener('change',()=>{st.chainScores=[];renderChain()});
 by('miChainPreview').addEventListener('click',e=>{const b=e.target.closest('[data-chain-step]');if(!b)return;const i=Number(b.dataset.chainStep),step=st.chainScores[i];if(!step)return;step.response=b.dataset.chainResponse;step.prompt='None';renderChain()});
 by('miChainPreview').addEventListener('change',e=>{const i=Number(e.target.dataset.chainPrompt);if(!Number.isInteger(i)||!st.chainScores[i])return;st.chainScores[i].prompt=e.target.value;renderChain()});
 by('miProvider').addEventListener('change',syncProvider);
 by('miForm').addEventListener('submit',e=>{e.preventDefault();saveEntry()});
 by('miClear').addEventListener('click',()=>clearForm());
 by('miClearBehaviors').addEventListener('click',()=>renderBehaviors());
 by('miBehaviors').addEventListener('click',adjustBehavior);
 for(const b of document.querySelectorAll('#miForm [data-response]'))b.addEventListener('click',()=>setResponse(b.dataset.response));
 by('miNoResponse').addEventListener('change',e=>setResponse(e.target.checked?'no_response':''));
 by('miNa').addEventListener('change',e=>setResponse(e.target.checked?'na':''));
 by('miApplyFilter').addEventListener('click',()=>{st.filters=activeFilters();st.page=0;st.selected.clear();renderRows()});
 by('miClearFilters').addEventListener('click',()=>{by('miFilterProgram').value='';by('miFilterFrom').value='';by('miFilterTo').value='';by('miFilterProvider').value='';st.filters={};st.page=0;st.selected.clear();renderRows()});
 by('miPrev').addEventListener('click',()=>{st.page=Math.max(0,st.page-1);renderRows()});
 by('miNext').addEventListener('click',()=>{st.page++;renderRows()});
 by('miGraphToggle').addEventListener('click',()=>{st.showGraph=!st.showGraph;by('miGraphToggle').textContent=st.showGraph?'Hide Graph':'⌁ Show Graph';by('miGraphToggle').setAttribute('aria-expanded',String(st.showGraph));renderGraph(st.visible)});
 by('miSelectAll').addEventListener('change',e=>{for(const r of st.visible.slice(st.page*st.limit,(st.page+1)*st.limit).filter(canRemove)){if(e.target.checked)st.selected.add(r.id);else st.selected.delete(r.id)}renderRows()});
 by('miDeleteSelected').addEventListener('click',()=>deleteEntries([...st.selected]));
 by('miHistoryRows').addEventListener('change',e=>{const id=e.target.dataset.miSelect;if(!id)return;const row=st.rows.find(x=>x.id===id);if(!canRemove(row))return;if(e.target.checked)st.selected.add(row.id);else st.selected.delete(row.id);renderRows()});
 by('miHistoryRows').addEventListener('click',e=>{const edit=e.target.closest('[data-mi-edit]'),del=e.target.closest('[data-mi-delete]');if(edit)editEntry(edit.dataset.miEdit);if(del){const row=st.rows.find(x=>x.id===del.dataset.miDelete);if(row)deleteEntries([row.id]);}});
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
