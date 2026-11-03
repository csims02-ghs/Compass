/* COMPASS student Programs report; read-only, selected-student and RLS scoped. */
(function(w){
'use strict';
const STYLE="@page{size:letter;margin:0}\n*{box-sizing:border-box}html,body{margin:0;padding:0;background:#edf3f8;color:#163456;font-family:Arial,Helvetica,sans-serif}\n.controls{width:8.5in;margin:12px auto;display:flex;justify-content:space-between;align-items:center;color:#54708b;font:10pt Arial}\n.controls button{background:#164b7c;color:white;border:0;border-radius:5px;padding:9px 15px;cursor:pointer;font:700 10pt Arial}\n.sheet{position:relative;width:8.5in;height:11in;margin:0 auto 15px;background:white;box-shadow:0 5px 18px #173c5e22;overflow:hidden}\n.head{position:absolute;left:30.9pt;right:30.9pt;top:26pt;height:45pt;border-bottom:1.7pt solid #103558;display:flex;justify-content:space-between}\n.brand{font:900 18pt Arial;letter-spacing:-.5pt;color:#103558;line-height:1}\n.subbrand{font:400 6.75pt Arial;letter-spacing:1pt;color:#6c829b;margin-top:9pt}\n.report{text-align:right}.report h1{font:700 14.25pt Arial;color:#103558;margin:0 0 8pt}.report small{font:400 6.75pt Arial;color:#627b95}\n.student{position:absolute;left:30.9pt;right:30.9pt;top:79pt;height:41pt;padding:8pt 8.5pt;border:.8pt solid #dce4eb;background:#f8fafc;border-radius:5pt}\n.student strong{display:block;font:700 9.75pt Arial;color:#103558;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.student small{display:block;font:400 6.75pt Arial;color:#637c95;margin-top:4pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.snap-title{position:absolute;left:30.9pt;top:127.3pt;font:700 9.75pt Arial;color:#103558}\n.snap{position:absolute;left:30.9pt;right:30.9pt;top:144pt;height:72.5pt;padding:3pt 9pt;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:.8pt solid #dce4eb;border-radius:5pt}\n.tile{min-width:0;padding:4pt 3pt 3pt}.tile:nth-child(-n+3){border-bottom:.7pt solid #e4eaf0}\n.tile span{display:block;font:400 6.75pt Arial;color:#627890}.tile b{display:block;font:700 8.62pt Arial;color:#103558;margin-top:3pt}\n.section{position:absolute;left:30.9pt;right:30.9pt;top:222pt;display:flex;justify-content:space-between;align-items:baseline}\n.section h2{font:700 9.75pt Arimo,Arial,sans-serif;color:#103558;margin:0}.section small{font:400 6.75pt Arimo,Arial,sans-serif;color:#627890}\n.note{position:absolute;left:30.9pt;top:236pt;font:400 6.45pt Arimo,Arial,sans-serif;color:#6d8399}\ntable{position:absolute;left:30.9pt;top:249.5pt;width:550.2pt;border-collapse:collapse;table-layout:fixed;font:400 6.25pt Arimo,Arial,sans-serif;color:#163456}\ncol:nth-child(1){width:17pt}col:nth-child(2){width:138pt}col:nth-child(3){width:86pt}col:nth-child(4){width:150pt}col:nth-child(5){width:51pt}col:nth-child(6){width:43pt}col:nth-child(7){width:65.2pt}\nth,td{border:.6pt solid #d5e0ea;font-weight:400;vertical-align:middle;overflow-wrap:break-word}\nth{height:20pt;background:#f2f6fa;padding:2pt 3.6pt;text-align:left;color:#607992;font:400 5.8pt/1.15 Arimo,Arial,sans-serif}\ntbody tr{height:21.7pt}td{padding:2pt 3.3pt;font:400 6.25pt/1.18 Arimo,Arial,sans-serif}\nth:nth-child(5),th:nth-child(6){text-align:center}td:nth-child(1){text-align:center;color:#6a8298}td:nth-child(5),td:nth-child(6){text-align:right}td:nth-child(7){font-size:6.1pt}\n.foot{position:absolute;left:30.9pt;right:30.9pt;bottom:23.5pt;border-top:.7pt solid #dce4eb;padding-top:9pt;display:flex;justify-content:space-between;gap:10pt;font:400 6pt/1.45 Arimo,Arial,sans-serif;color:#668098}\n.foot span{max-width:480pt}.foot b{font:700 6.75pt Arimo,Arial,sans-serif;white-space:nowrap}\n@media print{html,body{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}.controls{display:none}.sheet{margin:0;box-shadow:none;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}}";
const el=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const iso=v=>String(v||'').slice(0,10);
const num=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
const counts=o=>o&&typeof o==='object'&&!Array.isArray(o)?Object.values(o).reduce((s,v)=>s+num(v),0):0;
const date=s=>/^\d{4}-\d\d-\d\d$/.test(iso(s))?iso(s).slice(5,7)+'/'+iso(s).slice(8,10)+'/'+iso(s).slice(0,4):'—';
const txt=v=>v===null||v===undefined||v===''?'—':esc(v);
function since(now){const d=new Date(now);d.setHours(12,0,0,0);d.setDate(d.getDate()-27);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function snapshot(label){
 const row=[...document.querySelectorAll('#supportSnapshot .snapshot-row')].find(x=>str(x.querySelector('span')?.textContent).toLowerCase()===label.toLowerCase());
 return str(row?.querySelector('strong')?.textContent);
}
function quick(label){
 const row=[...document.querySelectorAll('#quickInfo .quick-line')].find(x=>str(x.querySelector('small')?.textContent).toLowerCase()===label.toLowerCase());
 return str(row?.querySelector('strong')?.textContent);
}
function sessionBehaviors(s){
 let n=Number.isFinite(Number(s.total_behaviors))?num(s.total_behaviors):counts(s.behavior_counts);
 const source=s.source_record&&typeof s.source_record==='object'?s.source_record:{};
 if(source.behavior_review_user_attested_verified===true)n+=counts(source.estimated_behavior_counts_unverified);
 return n;
}
function trialSteps(m){
 const valid=['independent','independent_correct','prompted','incorrect','no_response'];
 if(Array.isArray(m.chain_steps)&&m.chain_steps.length)return m.chain_steps.filter(t=>(!t.trial_type||t.trial_type==='T')&&valid.includes(t.response)).map(t=>t.response);
 return valid.includes(m.response)?[m.response]:[];
}
function derive(data){
 const start=since(data.now),end=iso(data.now),sId=String(data.studentId);
 const assignments=(data.programs||[]).filter(p=>p.assignment?.student_id===sId&&p.assignment.status!=='archived').sort((a,b)=>(num(a.assignment.display_order)-num(b.assignment.display_order))||String(a.assignment.id).localeCompare(String(b.assignment.id)));
 const goals=(data.goals||[]).filter(g=>g.student_id===sId);
 const goalMap=new Map(goals.map(g=>[String(g.id),g]));
 const linkMap=new Map();
 for(const l of data.goalLinks||[]){const g=goalMap.get(String(l.goal_id)),id=String(l.student_compass_program_id);if(!g)continue;if(!linkMap.has(id))linkMap.set(id,[]);if(!linkMap.get(id).some(x=>x.id===g.id))linkMap.get(id).push(g)}
 const sessions=(data.sessions||[]).filter(s=>!s.deleted_at&&iso(s.session_date||s.created_at)>=start&&iso(s.session_date||s.created_at)<=end);
 const manuals=(data.manualTrials||[]).filter(m=>!m.deleted_at&&iso(m.event_date)>=start&&iso(m.event_date)<=end);
 const rows=assignments.map((p,i)=>{
  const a=p.assignment,d=p.definition||{},cfg=d.program_config&&typeof d.program_config==='object'?d.program_config:{},id=String(a.id);
  const ss=sessions.filter(s=>String(s.student_compass_program_id)===id),mm=manuals.filter(m=>String(m.student_compass_program_id)===id);
  let correct=0,total=0,behaviors=0;const sessionDays=new Set(ss.map(s=>iso(s.session_date||s.created_at))),manualDays=new Set();
  for(const s of ss){const n=num(s.trials_total),c=num(s.targets_correct);if(n&&c<=n){total+=n;correct+=c}behaviors+=sessionBehaviors(s)}
  for(const m of mm){const steps=trialSteps(m);total+=steps.length;correct+=steps.filter(x=>x==='independent'||x==='independent_correct').length;
   const b=counts(m.behavior_counts);behaviors+=b;if(steps.length||b)manualDays.add(iso(m.event_date))}
  const denominator=ss.length+[...manualDays].filter(d=>!sessionDays.has(d)).length;
  const rate=denominator?Math.round(behaviors/denominator*10)/10:null;
  const linked=(linkMap.get(id)||[]).sort((x,y)=>num(x.annual_goal_number||999)-num(y.annual_goal_number||999));
  const iep=linked.length?linked.map(g=>'Goal '+(g.annual_goal_number==null?'—':Number(g.annual_goal_number))+' – '+str(g.title||g.goal_area||'IEP Goal')).join(' | '):'—';
  const status=String(a.status||'').toLowerCase(),phase=String(a.instance_config?.acquisition_status||a.instance_config?.program_phase||'').toLowerCase();
  const display=status==='mastered'?'Mastered':status==='hold'?'On Hold':/maintenance/.test(phase)?'Maintenance':status==='active'?'In Progress':status||'—';
  return {n:i+1,name:str(d.program_name||a.program_name||'Program'),domain:str(cfg.skill_type||cfg.primary_domain||cfg.program_type||d.runner_key||'General'),iep,behavior:rate==null?'—':String(rate),accuracy:total?Math.round(correct/total*100)+'%':'—',status:display};
 });
 return {rows,pages:rows.length?Array.from({length:Math.ceil(rows.length/20)},(_,i)=>rows.slice(i*20,i*20+20)):[[]],active:assignments.filter(p=>p.assignment.status==='active').length,goals:goals.filter(g=>g.status==='active').length};
}
function render(data){
 if(!data?.studentId)throw Error('Selected student required');
 const d=derive(data),who=data.identity||{},snap=data.snapshot||{};
 const meta=['Grade '+(who.grade||'—'),who.school||'—',who.classroom||'—'].map(esc).join(' &nbsp; · &nbsp; ');
 const tile=(name,value)=>'<div class="tile"><span>'+esc(name)+'</span><b>'+txt(value)+'</b></div>';
 const start=i=>'<header class="head"><div><div class="brand">COMPASS</div><div class="subbrand">STUDENT SUPPORT</div></div><div class="report"><h1>Student Progress Report</h1><small>Last 4 weeks &nbsp; · &nbsp; '+date(data.now)+'</small></div></header>'+
  '<div class="student"><strong>'+esc(who.name||'Student')+' &nbsp; | &nbsp; ID '+esc(who.code||'—')+'</strong><small>'+meta+'</small></div>'+
  '<div class="snap-title">Student Support Snapshot</div><div class="snap">'+tile('Primary Service',snap.primaryService||'None entered')+
  tile('Active Programs',d.active)+tile('IEP Goals Tracked',d.goals)+tile('Target Behaviors',String(snap.behaviorCount??0)+' selected')+
  tile('Last Session',snap.lastSession||'—')+tile('Data Review',snap.dataReview||'—')+'</div>'+
  '<div class="section"><h2>Assigned Programs'+(i?' (continued)':'')+'</h2><small>'+d.rows.length+' programs shown</small></div>'+
  '<div class="note">Program progress and linked IEP goals &nbsp;·&nbsp; Behavior rate shown as number per session</div>';
 const heading='<colgroup><col><col><col><col><col><col><col></colgroup><thead><tr><th>#</th><th>PROGRAM</th><th>DOMAIN</th><th>IEP GOAL</th><th>BEHAVIOR RATE</th><th>ACCURACY</th><th>STATUS</th></tr></thead>';
 const pages=d.pages.map((chunk,i)=>'<section class="sheet">'+start(i)+'<table>'+heading+'<tbody>'+
  (chunk.length?chunk.map(r=>'<tr><td>'+r.n+'</td><td>'+esc(r.name)+'</td><td>'+esc(r.domain)+'</td><td>'+esc(r.iep)+'</td><td>'+esc(r.behavior)+'</td><td>'+esc(r.accuracy)+'</td><td>'+esc(r.status)+'</td></tr>').join(''):'<tr><td colspan="7">No programs assigned.</td></tr>')+
  '</tbody></table><footer class="foot"><span>Based on saved student-specific records (last 4 weeks). Behavior Rate = incidents per recorded session or manual observation day. “—” means insufficient data.'+(data.manualReadError?' Some manual data could not be loaded.':'')+'</span><b>Page '+(i+1)+' of '+d.pages.length+'</b></footer></section>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>COMPASS - '+esc(who.name||'Student')+' - Programs Report</title><style>'+STYLE+'</style></head><body><div class="controls"><span>COMPASS · Programs report · '+d.rows.length+' programs</span><button type="button" onclick="window.print()">Print / Save as PDF</button></div>'+pages+'</body></html>';
}
async function manualRecords(sid,start){
 const api=w.COMPASS_MANUAL_BRIDGE;if(!api?.query)throw Error('Manual data source unavailable');
 let output=[];
 for(let offset=0;offset<20000;offset+=500){
  const r=await api.query('compass_manual_trial_entries')
   .select('id,student_id,student_compass_program_id,event_date,trial_type,response,behavior_counts,chain_steps,deleted_at')
   .eq('student_id',sid).is('deleted_at',null).gte('event_date',start).order('event_date',{ascending:true}).range(offset,offset+499);
  if(r.error)throw r.error;const rows=Array.isArray(r.data)?r.data:[];output.push(...rows);if(rows.length<500)return output;
 }
 throw Error('Manual report limit exceeded');
}
function payload(snap,manual,error){
 const ctx=w.COMPASS_MANUAL_BRIDGE?.context?.();
 if(ctx?.currentStudentId&&String(ctx.currentStudentId)!==String(snap.studentId))throw Error('Selected student changed');
 const sessions=(snap.sessions||[]).filter(s=>!s.deleted_at);
 const last=sessions.slice().sort((a,b)=>iso(b.session_date||b.created_at).localeCompare(iso(a.session_date||a.created_at)))[0];
 const goals=(snap.goals||[]).filter(g=>String(g.student_id)===String(snap.studentId));
 const review=goals.map(g=>g.review_date).filter(Boolean).sort()[0];
 return {studentId:String(snap.studentId),now:new Date().toISOString(),identity:{
   name:str(el('profileName')?.textContent)||snap.studentName||'Student',
   code:str(el('profileMeta')?.textContent).replace(/^Student ID:\s*/i,''),
   grade:quick('Grade'),school:quick('School'),classroom:quick('Classroom')},
  snapshot:{primaryService:snapshot('Primary Service')||'None entered',behaviorCount:snapshot('Target Behaviors').match(/\d+/)?.[0]||'0',
  lastSession:date(last?.session_date),dataReview:date(review)},
  programs:(snap.programs||[]).filter(p=>String(p.assignment?.student_id)===String(snap.studentId)),
  goals,goalLinks:snap.goalLinks||[],sessions,manualTrials:manual,manualReadError:error};
}
async function openReport(){
 const snap=w.__compassProgressSnapshot,ctx=w.COMPASS_MANUAL_BRIDGE?.context?.();
 if(!snap?.studentId||!ctx?.currentStudentId||String(snap.studentId)!==String(ctx.currentStudentId)){
  w.alert('Finish loading the selected student profile before printing.');return;
 }
 const root=el('page-student-profile');
 if(root?.classList.contains('compass-profile-loading')||root?.getAttribute('aria-busy')==='true'){
  w.alert('Finish loading the student profile before printing.');return;
 }
 const win=w.open('','_blank','width=930,height=1150');if(!win){w.alert('Allow pop-ups to open the COMPASS Programs report.');return}
 win.document.open();win.document.write('<!doctype html><html><body style="font:14px Arial;padding:30px">Preparing Programs report…</body></html>');win.document.close();
 try{
  let manual=[],error=false;
  try{manual=await manualRecords(snap.studentId,since(new Date()))}
  catch(e){console.warn('Manual records unavailable for Programs print',e);error=true;
    if(snap.manualTrialsLoaded&&Array.isArray(snap.manualTrials)){manual=snap.manualTrials;error=false}}
  if(win.closed)return;
  const html=render(payload(snap,manual,error));
  win.document.open();win.document.write(html);win.document.close();win.focus();
  setTimeout(()=>{if(!win.closed)try{win.print()}catch(e){}},200);
 }catch(e){console.error('COMPASS Programs print failed',e);if(!win.closed){win.document.open();win.document.write('<html><body style="font:14px Arial;padding:30px">Unable to prepare the Programs report. Please reopen the student profile.</body></html>');win.document.close()}}
}
function setup(){const b=el('printStudentProgramsReportBtn');if(b&&!b.dataset.reportBound){b.dataset.reportBound='1';b.addEventListener('click',openReport)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
w.CompassProgramsPrintReport={derive,render,openReport};
})(window);