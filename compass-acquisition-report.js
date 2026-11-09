(function acquisitionReport(w,d){
'use strict';
const byId=id=>d.getElementById(id);
const str=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=v=>str(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=v=>/^\d{4}-\d{2}-\d{2}/.test(String(v||''))?String(v).slice(0,10):'';
const fdate=v=>{const s=iso(v);return s?s.slice(5,7)+'/'+s.slice(8,10)+'/'+s.slice(2,4):'—';};
const longDate=v=>{const s=iso(v);return s?s.slice(5,7)+'/'+s.slice(8,10)+'/'+s.slice(0,4):'—';};
const days=(a,b)=>{if(!iso(a)||!iso(b))return '—';const n=Math.round((Date.parse(iso(b)+'T12:00:00Z')-Date.parse(iso(a)+'T12:00:00Z'))/86400000);return n>=0?String(n):'—';};
const range=(v,a,b)=>{const s=iso(v);return s&&(!a||s>=a)&&(!b||s<=b)?s:'';};
const lastDate=a=>a.map(iso).filter(Boolean).sort().at(-1)||'';
const firstDate=a=>a.map(iso).filter(Boolean).sort()[0]||'';
function reintro(cfg){
 if(!cfg||typeof cfg!=='object')return '';
 const history=cfg.acquisition_history||cfg.acquisitionHistory||cfg.acquisition?.history||[];
 const found=[cfg.reintroduced_at,cfg.reintroduced_date,cfg.reintroduction_date];
 if(Array.isArray(history))for(const e of history)if(e&&/reintroduc/i.test(str(e.type||e.event||e.status)))found.push(e.date||e.at||e.occurred_at);
 return lastDate(found);
}
function getStudent(snap){
 const quick=k=>{const line=[...d.querySelectorAll('#quickInfo .quick-line')].find(e=>str(e.querySelector('small')?.textContent).toLowerCase()===k.toLowerCase());return str(line?.querySelector('strong')?.textContent);};
 return {name:str(byId('profileName')?.textContent)||snap.studentName||'Student',code:str(byId('profileMeta')?.textContent).replace(/^Student ID:\s*/i,''),grade:quick('Grade'),school:quick('School'),classroom:quick('Classroom')};
}
function selectedSnapshot(){
 const snap=w.__compassProgressSnapshot,ctx=w.COMPASS_MANUAL_BRIDGE?.context?.(),page=byId('page-student-profile');
 if(!snap?.studentId||!ctx?.currentStudentId||String(snap.studentId)!==String(ctx.currentStudentId)||page?.classList.contains('compass-profile-loading')||page?.getAttribute('aria-busy')==='true')throw Error('Finish loading the selected student profile before printing.');
 return snap;
}
async function getTargets(studentId,assignments){
 const api=w.COMPASS_MANUAL_BRIDGE;if(!api?.query)throw Error('COMPASS target data not available');
 const ids=assignments.map(p=>String(p.assignment.id)),result=[];
 for(let start=0;start<ids.length;start+=35){
  const group=ids.slice(start,start+35);
  for(let offset=0;offset<50000;offset+=500){
   const r=await api.query('student_compass_program_targets')
    .select('id,student_compass_program_id,target_name,target_key,status,display_order,introduced_at,mastered_at,metadata')
    .in('student_compass_program_id',group).order('student_compass_program_id').order('display_order').order('id').range(offset,offset+499);
   if(r.error)throw r.error;
   const batch=Array.isArray(r.data)?r.data:[];result.push(...batch);
   if(batch.length<500)break;
  }
 }
 if(String(api.context?.()?.currentStudentId)!==String(studentId))throw Error('Student selection changed while report was loading');
 return result;
}
// Use the earliest saved instructional event when an explicit introduction date
// has not been recorded. An assignment date is NOT a teaching date.
function observedIntroduction(snap,manual){
 const out=new Map();
 function record(id,when){
  const key=String(id||''),v=iso(when);
  if(!key||!v)return;
  const old=out.get(key);
  if(!old||v<old)out.set(key,v);
 }
 for(const s of snap.sessions||[])if(!s.deleted_at&&Number(s.trials_total||0)>0)
  record(s.student_compass_program_id,s.session_date);
 for(const t of snap.trialEvents||[])if(!t.deleted_at&&(!t.trial_type||t.trial_type==='T'))
  record(t.student_compass_program_id,t.occurred_at);
 for(const m of manual||[])if(!m.deleted_at&&(!m.trial_type||m.trial_type==='T'))
  record(m.student_compass_program_id,m.event_date);
 return out;
}
async function manualIntroductionDates(sid){
 const bridge=w.COMPASS_MANUAL_BRIDGE;if(!bridge?.query)return [];
 const out=[];
 for(let offset=0;offset<20000;offset+=500){
  const r=await bridge.query('compass_manual_trial_entries')
   .select('student_compass_program_id,event_date,trial_type,deleted_at')
   .eq('student_id',sid).is('deleted_at',null)
   .order('event_date',{ascending:true}).range(offset,offset+499);
  if(r.error)throw r.error;
  const data=Array.isArray(r.data)?r.data:[];
  out.push(...data);if(data.length<500)return out;
 }
 throw Error('Manual record limit exceeded');
}
function model(snap,targets,student,manual=[]){
 const sid=String(snap.studentId),goals=new Map((snap.goals||[]).filter(x=>String(x.student_id)===sid).map(g=>[String(g.id),g])),
  links=new Map(),targetGroups=new Map();
 for(const l of snap.goalLinks||[]){const g=goals.get(String(l.goal_id)),key=String(l.student_compass_program_id);if(!g)continue;if(!links.has(key))links.set(key,[]);if(!links.get(key).some(x=>x.id===g.id))links.get(key).push(g);}
 for(const t of targets){const key=String(t.student_compass_program_id);if(!targetGroups.has(key))targetGroups.set(key,[]);targetGroups.get(key).push(t);}
 const observed=observedIntroduction(snap,manual);
 const rank=t=>t.status==='acquisition'?0:t.status==='maintenance'?1:t.status==='mastered'?2:t.status==='not_introduced'?3:4;
 const assignments=(snap.programs||[]).filter(x=>String(x.assignment?.student_id)===sid&&x.assignment?.status!=='archived').sort((a,b)=>(Number(a.assignment.display_order)||0)-(Number(b.assignment.display_order)||0));
 return {student,rows:assignments.map((p,i)=>{
  const a=p.assignment,key=String(a.id),def=p.definition||{},ts=(targetGroups.get(key)||[]).sort((x,y)=>rank(x)-rank(y)||(Number(x.display_order)||0)-(Number(y.display_order)||0)),primary=ts[0],
   goalsLinked=(links.get(key)||[]).sort((x,y)=>(Number(x.annual_goal_number)||999)-(Number(y.annual_goal_number)||999));
  // Explicit start/target introduction is authoritative. Otherwise use the first
  // documented instructional date, not the date the program was assigned.
  const explicitIntroduced=firstDate([a.start_date,...ts.map(t=>t.introduced_at)]);
  const introduced=explicitIntroduced||observed.get(key)||'';
  const introducedSource=explicitIntroduced?'explicit':introduced?'first-session':'unrecorded';
  const mastered=iso(a.mastery_date)||firstDate(ts.map(t=>t.mastered_at));
  const reintroduced=lastDate([reintro(a.instance_config),...ts.map(t=>reintro(t.metadata))]);
  const phase=str(a.instance_config?.program_phase||a.instance_config?.acquisition_status).toLowerCase();
  let status=a.status==='mastered'?'Mastered':a.status==='hold'?'On Hold':phase.includes('maintenance')?'Maintenance':'In Progress';
  if(reintroduced&&(!mastered||reintroduced>mastered))status='Reintroduced';
  return {n:i+1,name:str(def.program_name||a.program_name||'Program'),target:ts.slice(0,2).map(t=>str(t.target_name||t.target_key||'Unnamed target')),
   extra:Math.max(0,ts.length-2),goals:goalsLinked.map(g=>'Goal '+(g.annual_goal_number??'—')).join(', ')||'—',
   introduced,introducedSource,mastered,reintroduced,status,notes:str(a.instance_config?.acquisition_notes||a.instance_config?.acquisition_note||'')};
 })};
}
const CSS=`
@page{size:letter portrait;margin:0}
*{box-sizing:border-box}
body{margin:0;background:#eaf0f6;color:#183553;font-family:Arial,Helvetica,sans-serif}
.toolbar{max-width:8.5in;margin:12px auto;padding:11px 14px;background:#fff;display:flex;align-items:end;gap:12px;flex-wrap:wrap;border:1px solid #cbd9e7;border-radius:8px}
.toolbar label{font-size:12px;color:#435a73;font-weight:600;display:flex;flex-direction:column;gap:4px}
.toolbar input{font:13px Arial;border:1px solid #bacbdb;border-radius:4px;padding:7px;color:#163656}
.toolbar button{border:0;border-radius:5px;background:#164b7c;color:white;padding:9px 12px;font-weight:bold;cursor:pointer}
.toolbar button:disabled{opacity:.5;cursor:wait}.toolbar .hint{font:11px/1.45 Arial;color:#647b8f;flex:1;min-width:150px}
.sheet{width:8.5in;height:11in;background:#fff;margin:0 auto 14px;padding:.4in;box-shadow:0 5px 18px #173c5e22;display:flex;flex-direction:column;page-break-after:always;break-after:page;overflow:hidden}
.sheet:last-child{break-after:auto;page-break-after:auto}
.header{display:flex;justify-content:space-between;align-items:start;gap:8pt;border-bottom:1.5pt solid #123b64;padding-bottom:8pt}
.brand{font:bold 17pt Arial;color:#103558}.brand small{display:block;margin-top:3pt;font:normal 6.5pt Arial;letter-spacing:1pt;color:#6b8197}
.heading{text-align:right}.heading h1{font:bold 13pt Arial;color:#103558;margin:0 0 6pt}.heading small{font:7pt Arial;color:#627d95}
.student{display:grid;grid-template-columns:1.3fr 1fr;gap:4pt 12pt;background:#f5f8fb;border:.7pt solid #d6e0ea;padding:7pt;margin:10pt 0}
.info{font:7pt/1.35 Arial;overflow-wrap:anywhere}.info b{color:#103558}
.section-title{font:bold 9pt Arial;color:#103558;margin:1pt 0 5pt}
.stats{display:grid;grid-template-columns:repeat(4,1fr);border:.7pt solid #d7e1ea;margin-bottom:11pt}
.stats div{padding:6pt;text-align:center;border-right:.7pt solid #d7e1ea}.stats div:last-child{border-right:0}
.stats strong{display:block;font-size:10pt;color:#183b61}.stats span{font:6.6pt Arial;color:#617a90}
.subline{display:flex;justify-content:space-between;font:7pt Arial;color:#667d91;margin:0 0 5pt}
table{border-collapse:collapse;width:100%;table-layout:fixed;font:6.5pt/1.22 Arial;color:#183553}
th,td{border:.55pt solid #cfdae4;padding:5pt 3pt;vertical-align:top;overflow-wrap:anywhere}
th{background:#eaf1f7;color:#173b61;font:bold 6.4pt/1.2 Arial;text-align:left}
td.program{font-weight:bold}td.center{text-align:center}td.dates{text-align:center;white-space:nowrap;font-size:6.2pt}
td.targets{font-size:6.3pt}td.targets small{display:block;color:#657e93;margin-top:3pt}td.status{font-weight:bold;font-size:6.2pt}td.notes{font-size:6.2pt;color:#566c7e}
tbody tr{break-inside:avoid;page-break-inside:avoid}
.legend{border-top:.6pt solid #dae3ec;margin-top:10pt;padding-top:6pt;display:flex;flex-direction:column;gap:3pt;font:6.4pt/1.35 Arial;color:#60778b}
.legend b{color:#183c60}
.footer{margin-top:auto;border-top:1pt solid #123f69;padding-top:6pt;display:flex;justify-content:space-between;color:#58728a;font:6.6pt Arial}
@media print{body{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}.toolbar{display:none!important}.sheet{margin:0;box-shadow:none;width:8.5in;height:11in;page-break-after:always;break-after:page}.sheet:last-child{break-after:auto;page-break-after:auto}}
`;
function render(model,start,end,loadError){
 const records=model.rows.map(r=>({...r,introducedIn:range(r.introduced,start,end),masteredIn:range(r.mastered,start,end),reintroducedIn:range(r.reintroduced,start,end)}));
 const pages=[];for(let i=0;i<records.length;i+=10)pages.push(records.slice(i,i+10));if(!pages.length)pages.push([]);
 const dates=records.map(r=>days(r.introducedIn,r.masteredIn)).filter(x=>x!=='—').map(Number);
 const average=dates.length?(dates.reduce((a,b)=>a+b,0)/dates.length).toFixed(1):'—';
 const mastered=records.filter(x=>x.masteredIn).length,reintroduced=records.filter(x=>x.reintroducedIn).length,
  time=start||end?(start?longDate(start):'Earliest')+' – '+(end?longDate(end):'Latest'):'All recorded dates',s=model.student;
 return pages.map((chunk,pi)=>{
  const tableRows=chunk.length?chunk.map(r=>'<tr>'+
   '<td class="program">'+esc(r.name)+'</td><td class="targets">'+(r.target.length?r.target.map(esc).join('; '):'—')+(r.extra?'<small>+'+r.extra+' more targets</small>':'')+'</td>'+
   '<td class="center">'+esc(r.goals)+'</td><td class="dates">'+fdate(r.introducedIn)+(r.introducedIn&&r.introducedSource==='first-session'?'*':'')+'</td><td class="dates">'+fdate(r.masteredIn)+'</td>'+
   '<td class="dates">'+fdate(r.reintroducedIn)+'</td><td class="status">'+esc(r.status)+'</td><td class="center">'+days(r.introducedIn,r.masteredIn)+'</td>'+
   '<td class="notes">'+esc(r.notes||'—')+'</td></tr>').join(''):'<tr><td colspan="9">No active assigned programs recorded.</td></tr>';
  return '<section class="sheet"><div class="header"><div class="brand">COMPASS<small>STUDENT SUPPORT</small></div><div class="heading"><h1>Programs Acquisition Report</h1><small>'+esc(time)+'</small></div></div>'+
   '<div class="student"><div class="info"><b>Student:</b> '+esc(s.name)+' &nbsp; | &nbsp; <b>ID:</b> '+esc(s.code||'—')+'</div><div class="info"><b>School:</b> '+esc(s.school||'—')+'</div>'+
   '<div class="info"><b>Grade:</b> '+esc(s.grade||'—')+' &nbsp; · &nbsp; <b>Classroom:</b> '+esc(s.classroom||'—')+'</div><div class="info"><b>Date Range:</b> '+esc(time)+'</div></div>'+
   '<div class="section-title">Program Acquisition Summary</div><div class="stats"><div><strong>'+records.length+'</strong><span>Assigned Programs</span></div>'+
   '<div><strong>'+mastered+'</strong><span>Mastery Dates in Range</span></div><div><strong>'+reintroduced+'</strong><span>Reintroduced in Range</span></div>'+
   '<div><strong>'+average+'</strong><span>Average Days to Mastery</span></div></div>'+
   '<div class="subline"><span>Assigned Programs · Target & IEP Connections</span><span>Programs '+(chunk.length?pi*10+1:0)+'–'+(pi*10+chunk.length)+' of '+records.length+'</span></div>'+
   '<table><colgroup><col style="width:14%"><col style="width:17%"><col style="width:8%"><col style="width:10%"><col style="width:10%"><col style="width:10%"><col style="width:9%"><col style="width:6%"><col style="width:16%"></colgroup>'+
   '<thead><tr><th>Program</th><th>Target</th><th>IEP<br>Goal</th><th>Introduced</th><th>Mastered</th><th>Reintroduced</th><th>Current Status</th><th>Days</th><th>Notes</th></tr></thead><tbody>'+tableRows+'</tbody></table>'+
   '<div class="legend"><span><b>Status:</b> Mastered · In Progress · Maintenance · Reintroduced · On Hold</span><span>* First recorded instructional date if no explicit introduction date is saved. “—” = no milestone in range.'+(loadError?' Target list incomplete.':'')+'</span></div>'+
   '<div class="footer"><span>COMPASS Student Support · Acquisition history</span><span>Page '+(pi+1)+' of '+pages.length+'</span><span>Printed '+longDate(new Date().toISOString())+'</span></div></section>';
 }).join('');
}
function redraw(popup,model,error){
 const from=iso(popup.document.getElementById('acqFrom').value),to=iso(popup.document.getElementById('acqTo').value),hint=popup.document.getElementById('acqHint');
 if(from&&to&&from>to){hint.textContent='Start date must be before or equal to end date.';return false;}
 hint.textContent='Custom dates filter saved milestones. All assigned programs remain listed.';
 popup.document.getElementById('acqPages').innerHTML=render(model,from,to,error);return true;
}
async function openReport(){
 let snap;try{snap=selectedSnapshot();}catch(e){w.alert(e.message);return;}
 const studentId=String(snap.studentId),student=getStudent(snap),popup=w.open('','_blank','width=950,height=1100');
 if(!popup){w.alert('Please allow pop-ups to open the Acquisition Report.');return;}
 popup.document.open();
 popup.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>COMPASS · Acquisition Report</title><style>'+CSS+'</style></head><body>'+
  '<div class="toolbar"><label>From<input id="acqFrom" type="date" aria-label="From date"></label><label>To<input id="acqTo" type="date" aria-label="To date"></label>'+
  '<button id="acqPrint" type="button" disabled>Print / Save PDF</button><div id="acqHint" class="hint">Loading the selected student’s acquisition history…</div></div><div id="acqPages"></div></body></html>');
 popup.document.close();
 try{
  const assigned=(snap.programs||[]).filter(p=>String(p.assignment?.student_id)===studentId&&p.assignment?.status!=='archived');
  let targets=[],manual=[],error=false;
  try{targets=await getTargets(studentId,assigned);}catch(e){console.warn('Target read unavailable for acquisition report',e);error=true;}
  try{manual=await manualIntroductionDates(studentId);}catch(e){console.warn('Manual instructional dates unavailable for acquisition report',e);}
  if(popup.closed||String(w.COMPASS_MANUAL_BRIDGE?.context?.()?.currentStudentId)!==studentId)return;
  const m=model(snap,targets,student,manual);redraw(popup,m,error);
  for(const id of ['acqFrom','acqTo'])popup.document.getElementById(id).addEventListener('change',()=>redraw(popup,m,error));
  const btn=popup.document.getElementById('acqPrint');btn.disabled=false;btn.addEventListener('click',()=>{if(redraw(popup,m,error))popup.print();});popup.focus();
 }catch(e){console.error('Acquisition Report error',e);if(!popup.closed)popup.document.getElementById('acqHint').textContent='Unable to prepare report. Reopen the student profile and try again.';}
}
async function prepareCombinedReport(expectedId){
 const snap=selectedSnapshot(),sid=String(snap.studentId);
 if(sid!==String(expectedId))throw Error('The student changed while preparing the acquisition report.');
 const student=getStudent(snap);
 const assigned=(snap.programs||[]).filter(p=>String(p.assignment?.student_id)===sid&&p.assignment?.status!=='archived');
 let targets=[],manual=[],error=false;
 try{targets=await getTargets(sid,assigned);}catch(e){error=true;console.warn('Acquisition targets unavailable',e);}
 try{manual=await manualIntroductionDates(sid);}catch(e){console.warn('Acquisition manual dates unavailable',e);}
 if(String(w.COMPASS_MANUAL_BRIDGE?.context?.()?.currentStudentId)!==sid)throw Error('Student changed while preparing the acquisition report.');
 const content=render(model(snap,targets,student,manual),'','',error);
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Acquisition History</title><style>'+CSS+'</style></head><body>'+content+'</body></html>';
}
function setup(){const b=byId('printStudentAcquisitionReportBtn');if(b&&!b.dataset.acquisitionBound){b.dataset.acquisitionBound='true';b.addEventListener('click',openReport);}}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
w.CompassAcquisitionReport={openReport,model,render,prepareCombinedReport};
})(window,document);
