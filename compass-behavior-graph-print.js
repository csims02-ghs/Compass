(function behaviorGraphPrint(w,d){
'use strict';
const $=id=>d.getElementById(id);
const norm=x=>String(x??'').trim().replace(/\s+/g,' ');
const esc=x=>norm(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=x=>/^\d{4}-\d{2}-\d{2}/.test(String(x||''))?String(x).slice(0,10):'';
const count=x=>Number.isFinite(Number(x))?Math.max(0,Math.floor(Number(x))):0;
const fmt=x=>x?x.slice(5,7)+'/'+x.slice(8,10)+'/'+x.slice(0,4):'—';
let cache={id:'',records:[],names:[],failed:[],loaded:false},loadId=0;
function context(){
 const snap=w.__compassProgressSnapshot,c=w.COMPASS_MANUAL_BRIDGE?.context?.();
 if(!snap?.studentId||!c?.currentStudentId||String(snap.studentId)!==String(c.currentStudentId))throw Error('Load a student profile first.');
 if($('page-student-profile')?.classList.contains('compass-profile-loading'))throw Error('Finish loading the selected student first.');
 return {sid:String(snap.studentId),snap,c};
}
async function paged(table,query,col,value){
 const api=w.COMPASS_MANUAL_BRIDGE?.query;if(!api)throw Error('COMPASS data access is not ready.');
 const out=[];
 for(let i=0;i<15000;i+=500){
  let q=api(table).select(query).eq(col,value).range(i,i+499);
  // Sorting by id ensures stable pages even when many rows have the same date.
  q=q.order('id',{ascending:true});
  const r=await q;if(r.error)throw r.error;
  const batch=Array.isArray(r.data)?r.data:[];
  out.push(...batch);if(batch.length<500)return out;
 }
 throw Error('Record limit exceeded; narrow the data source.');
}
async function programSessions(sid){
 const programs=await paged('student_compass_programs','id,student_id','student_id',sid);
 const out=[];
 for(let i=0;i<programs.length;i+=40){
  const ids=programs.slice(i,i+40).map(p=>p.id);
  if(!ids.length)continue;
  for(let j=0;j<15000;j+=500){
   const r=await w.COMPASS_MANUAL_BRIDGE.query('compass_program_sessions')
    .select('id,student_compass_program_id,session_date,behavior_counts,deleted_at')
    .in('student_compass_program_id',ids).is('deleted_at',null).order('id',{ascending:true}).range(j,j+499);
   if(r.error)throw r.error;
   const batch=Array.isArray(r.data)?r.data:[];
   for(const s of batch)out.push({date:iso(s.session_date),counts:s.behavior_counts,source:'sessions',id:s.id});
   if(batch.length<500)break;
  }
 }
 return out;
}
function flattenCounts(item){
 const o=item.counts;
 if(!o||typeof o!=='object'||Array.isArray(o))return [];
 return Object.entries(o).filter(([k,v])=>norm(k)&&Number.isFinite(Number(v))&&Number(v)>=0).map(([name,v])=>({date:item.date,name:norm(name),count:count(v),source:item.source,key:item.id+':'+name}));
}
async function readStudent(sid){
 const jobs=await Promise.allSettled([
  programSessions(sid),
  paged('compass_manual_trial_entries','id,student_id,event_date,behavior_counts,deleted_at','student_id',sid),
  paged('student_behavior_data','id,student_id,data_date,behavior_name,count,data_type,deleted_at','student_id',sid)
 ]);
 const failed=[],records=[];
 if(jobs[0].status==='fulfilled')for(const s of jobs[0].value)records.push(...flattenCounts(s));
 else failed.push('sessions');
 if(jobs[1].status==='fulfilled')for(const m of jobs[1].value){if(!m.deleted_at)records.push(...flattenCounts({date:iso(m.event_date),counts:m.behavior_counts,source:'manual',id:m.id}));}
 else failed.push('manual');
 if(jobs[2].status==='fulfilled')for(const b of jobs[2].value){
  if(!b.deleted_at&&norm(b.behavior_name)&&Number.isFinite(Number(b.count))&&Number(b.count)>=0)
   records.push({date:iso(b.data_date),name:norm(b.behavior_name),count:count(b.count),source:'log',key:b.id});
 }else failed.push('log');
 const seen=new Set(),unique=[];
 for(const r of records){if(!r.date||seen.has(r.source+':'+r.key))continue;seen.add(r.source+':'+r.key);unique.push(r);}
 const observed=w.COMPASS_MANUAL_BRIDGE?.observedBehaviors?.();
 const names=[...new Set([...unique.map(x=>x.name),...((observed&&String(observed.studentId)===sid)?observed.behaviors.map(x=>norm(x.name)):[])])].filter(Boolean).sort((a,b)=>a.localeCompare(b));
 return {id:sid,records:unique,names,failed,loaded:true};
}
function monday(s){
 const t=new Date(s+'T12:00:00Z');const dow=t.getUTCDay();t.setUTCDate(t.getUTCDate()-(dow===0?6:dow-1));return t.toISOString().slice(0,10);
}
function summarize(records,filters){
 const {source='sessions',behavior='all',from='',to='',interval='week',type='line'}=filters;
 const list=records.filter(r=>(source==='all'||r.source===source)&&(behavior==='all'||r.name===behavior)&&(!from||r.date>=from)&&(!to||r.date<=to));
 const grouped=new Map();
 for(const r of list){
  const label=type==='bar'?r.name:interval==='month'?r.date.slice(0,7):interval==='week'?monday(r.date):r.date;
  grouped.set(label,(grouped.get(label)||0)+r.count);
 }
 const keys=[...grouped.keys()].sort((a,b)=>a.localeCompare(b));
 return {points:keys.map(k=>({label:k,value:grouped.get(k)})),records:list,total:list.reduce((n,r)=>n+r.count,0),observations:new Set(list.map(r=>r.date)).size};
}
function svg(data,type){
 const pts=data.points;
 if(!pts.length)return '<div class="bgp-empty">No recorded behavior-frequency data for this selection. Missing observations are not plotted as zero.</div>';
 const W=690,H=290,L=57,R=25,T=20,B=226,plotH=B-T,plotW=W-L-R,n=pts.length;
 const vmax=Math.max(1,...pts.map(x=>x.value)),cap=Math.ceil(vmax/4)*4||4,yp=v=>B-v/cap*plotH;
 const grid=Array.from({length:5},(_,i)=>{const v=cap*i/4;return '<line x1="'+L+'" y1="'+yp(v)+'" x2="'+(W-R)+'" y2="'+yp(v)+'" stroke="#dce5ee"/><text x="'+(L-10)+'" y="'+(yp(v)+4)+'" text-anchor="end" font-size="11" fill="#617c98">'+v+'</text>';}).join('');
 const x=i=>L+(type==='bar'?(i+.5)/n:n===1?.5:i/(n-1))*plotW;
 const labelStep=Math.max(1,Math.ceil(n/8));
 const labels=pts.map((p,i)=>i%labelStep===0||i===n-1?'<text x="'+x(i)+'" y="'+(B+18)+'" text-anchor="middle" font-size="10" fill="#57718b">'+esc(p.label.length>16?p.label.slice(0,15)+'…':p.label)+'</text>':'').join('');
 let art='';
 if(type==='line'){
  const path=pts.map((p,i)=>x(i)+','+yp(p.value)).join(' ');
  if(pts.length>1)art+='<polyline points="'+path+'" fill="none" stroke="#1c5d9c" stroke-width="2.8" stroke-linejoin="round"/>';
  art+=pts.map((p,i)=>'<circle cx="'+x(i)+'" cy="'+yp(p.value)+'" r="3.4" fill="#1c5d9c"/>').join('');
 }else{
  const width=Math.min(56,plotW/n*.62);
  art=pts.map((p,i)=>'<rect x="'+(x(i)-width/2)+'" y="'+yp(p.value)+'" width="'+width+'" height="'+Math.max(0,B-yp(p.value))+'" rx="3" fill="#286ca7"/><text x="'+x(i)+'" y="'+Math.max(12,yp(p.value)-5)+'" text-anchor="middle" font-size="11" fill="#234b71">'+p.value+'</text>').join('');
 }
 return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="'+(type==='line'?'Behavior frequency timeline':'Behavior frequency by type')+'" xmlns="http://www.w3.org/2000/svg">'+grid+
  '<line x1="'+L+'" y1="'+B+'" x2="'+(W-R)+'" y2="'+B+'" stroke="#637e98"/>'+art+labels+
  '<text x="16" y="'+((T+B)/2)+'" transform="rotate(-90 16 '+((T+B)/2)+')" text-anchor="middle" font-size="12" fill="#365d81">Occurrences</text>'+
  '<text x="'+(W/2)+'" y="'+(H-9)+'" text-anchor="middle" font-size="12" fill="#365d81">'+(type==='line'?'Recorded dates':'Behavior category')+'</text></svg>';
}
const CSS=`
.bgp-card{margin-top:16px;background:#fff;border:1px solid #d3dfeb;border-radius:15px;padding:18px;box-shadow:0 2px 8px rgba(16,57,108,.04)}
.bgp-top{display:flex;align-items:start;justify-content:space-between;gap:14px;flex-wrap:wrap}.bgp-card h3{margin:0;color:#10396c;font-size:19px}.bgp-muted{font-size:12px;color:#647e95;line-height:1.5;margin:6px 0 12px}
.bgp-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:12px 0}
.bgp-fields label{display:flex;flex-direction:column;gap:5px;color:#435e78;font-size:12px;font-weight:600}
.bgp-fields input,.bgp-fields select{min-height:35px;min-width:0;width:100%;border-radius:7px;border:1px solid #cbd9e8;padding:7px;font-size:13px;color:#183f65;background:#fff;font-weight:400}
.bgp-actions{display:flex;gap:9px;flex-wrap:wrap}.bgp-card button{border:1px solid #c6d8e8;background:#fff;border-radius:6px;color:#164b7c;padding:9px 13px;font-size:12px;font-weight:700;cursor:pointer}.bgp-card button.primary{background:#164b7c;color:#fff;border-color:#164b7c}
.bgp-chart{border:1px solid #dce5ee;border-radius:9px;padding:12px;margin-top:12px;background:#fff;min-height:120px}.bgp-chart svg{display:block;max-width:100%;height:auto}
.bgp-empty{padding:22px;color:#6c8096;font-size:13px;text-align:center}
.bgp-meta{font:12px/1.5 Arial;color:#5d7790;margin-top:9px}.bgp-meta strong{color:#153e68}
`;
function sourceName(source){return source==='sessions'?'Program sessions':source==='manual'?'Manual trials':source==='log'?'Behavior log':'All sources (not deduplicated)';}
function setOptions(select,names,old){
 select.innerHTML='<option value="all">All behaviors</option>'+names.map(name=>'<option value="'+esc(name)+'">'+esc(name)+'</option>').join('');
 select.value=names.includes(old)?old:'all';
}
function filters(pane){
 const val=id=>pane.querySelector('#'+id)?.value||'';
 return {type:val('bgpType')||'line',source:val('bgpSource')||'sessions',behavior:val('bgpBehavior')||'all',from:iso(val('bgpFrom')),to:iso(val('bgpTo')),interval:val('bgpInterval')||'week'};
}
function refreshed(){
 const panel=$('compassBehaviorGraphPrinting'),pane=$('compassGraphsChartsPane');
 if(!panel||!pane)return;
 const chosen=filters(pane),msg=panel.querySelector('#bgpStatus'),holder=panel.querySelector('#bgpPreview');
 pane.querySelector('#bgpInterval').disabled=chosen.type==='bar';
 if(chosen.from&&chosen.to&&chosen.from>chosen.to){msg.textContent='Start date cannot be later than end date.';holder.innerHTML='';return;}
 if(!cache.loaded){msg.textContent='Choose Refresh Data to load the selected student’s recorded behavior data.';return;}
 if(cache.failed.includes(chosen.source)||chosen.source==='all'&&cache.failed.length){
  msg.textContent='The selected source could not be loaded ('+cache.failed.join(', ')+'). Refresh and try again.';holder.innerHTML='';return;
 }
 const result=summarize(cache.records,chosen);
 msg.textContent=sourceName(chosen.source)+' · '+result.total+' occurrences across '+result.observations+' recorded dates · '+result.points.length+' '+(chosen.type==='line'?'time periods':'behaviors');
 holder.innerHTML=svg(result,chosen.type);
}
async function load(){
 const pane=$('compassGraphsChartsPane'),panel=$('compassBehaviorGraphPrinting');
 if(!pane||!panel)return;
 const msg=panel.querySelector('#bgpStatus');
 let ctx;try{ctx=context();}catch(e){msg.textContent=e.message;return;}
 const token=++loadId;msg.textContent='Loading behavior frequency records…';
 try{
  const next=await readStudent(ctx.sid);
  if(token!==loadId||String(w.COMPASS_MANUAL_BRIDGE?.context?.()?.currentStudentId)!==ctx.sid)return;
  const current=pane.querySelector('#bgpBehavior'),old=current.value;cache=next;setOptions(current,cache.names,old);refreshed();
 }catch(e){console.error('Behavior graph load failed',e);msg.textContent='Unable to load behavior data. Try Refresh Data.';}
}
function person(){
 const q=k=>{const x=[...d.querySelectorAll('#quickInfo .quick-line')].find(y=>norm(y.querySelector('small')?.textContent).toLowerCase()===k.toLowerCase());return norm(x?.querySelector('strong')?.textContent);};
 return {name:norm($('profileName')?.textContent)||'Student',code:norm($('profileMeta')?.textContent).replace(/^Student ID:\s*/i,''),school:q('School'),classroom:q('Classroom'),grade:q('Grade')};
}
function print(){
 let c;try{c=context();}catch(e){w.alert(e.message);return;}
 if(!cache.loaded||cache.id!==c.sid){w.alert('Refresh behavior data for the selected student before printing.');return;}
 const pane=$('compassGraphsChartsPane'),f=filters(pane);
 if(f.from&&f.to&&f.from>f.to){w.alert('Date range is invalid.');return;}
 if(cache.failed.includes(f.source)||f.source==='all'&&cache.failed.length){w.alert('Selected behavior source is unavailable. Refresh the data before printing.');return;}
 const data=summarize(cache.records,f),p=person(),title=f.type==='line'?'Behavior Frequency Timeline':'Behavior Frequency by Category';
 const displayTime=f.from||f.to?(f.from?fmt(f.from):'Earliest')+' – '+(f.to?fmt(f.to):'Latest'):'All recorded dates';
 const bodyRows=data.points.map(x=>'<tr><td>'+esc(x.label)+'</td><td style="text-align:right">'+x.value+'</td></tr>').join('')||'<tr><td colspan="2">No recorded frequency for this selection.</td></tr>';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+esc(p.name)+' – '+esc(title)+'</title><style>'+
  '@page{size:letter portrait;margin:.48in}.p-toolbar{display:flex;justify-content:space-between;align-items:center;max-width:7.5in;margin:12px auto}.p-toolbar button{background:#164b7c;color:white;border:0;border-radius:5px;padding:10px 14px;cursor:pointer}' +
  'body{margin:0;background:#eef3f8;font:12px/1.45 Arial;color:#193956}.p-sheet{max-width:7.5in;margin:0 auto 16px;background:white;padding:12px 10px 18px}.p-head{border-bottom:2px solid #10396c;display:flex;justify-content:space-between;gap:10px;padding-bottom:9px}.p-head strong{font-size:19px;color:#10396c}.p-head h1{font-size:16px;margin:0;color:#10396c}.p-meta{background:#f4f7fa;border:1px solid #dce5ef;padding:9px;margin:12px 0;line-height:1.7}.p-chart{border:1px solid #dae4ee;padding:10px;page-break-inside:avoid}.p-chart svg{max-width:100%;height:auto;max-height:4.2in}.p-data{width:100%;border-collapse:collapse;margin-top:14px}.p-data th,.p-data td{padding:5px 8px;border:1px solid #dce5ee}.p-data th{background:#eaf1f7;text-align:left;color:#184069}thead{display:table-header-group}tr{page-break-inside:avoid}.p-note{font-size:10px;color:#658097;margin:12px 0}.p-foot{border-top:1px solid #c9d8e7;padding-top:8px;margin-top:15px;color:#658097;font-size:10px}@media print{body{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}.p-toolbar{display:none}.p-sheet{padding:0;margin:0;max-width:none}.p-chart{break-inside:avoid}}'+
  '</style></head><body><div class="p-toolbar"><span>COMPASS · Behavior Graph Print Preview</span><button onclick="window.print()">Print / Save as PDF</button></div><main class="p-sheet">'+
  '<div class="p-head"><div><strong>STUDENT REPORT</strong><div>STUDENT SUPPORT</div></div><div><h1>'+esc(title)+'</h1></div></div>'+
  '<div class="p-meta"><strong>'+esc(p.name)+'</strong> · ID '+esc(p.code||'—')+'<br>'+esc([p.grade,p.school,p.classroom].filter(Boolean).join(' · '))+
  '<br><strong>Dates:</strong> '+esc(displayTime)+' · <strong>Source:</strong> '+esc(sourceName(f.source))+' · <strong>Behavior:</strong> '+esc(f.behavior==='all'?'All behaviors':f.behavior)+
  (f.type==='line'?' · <strong>Interval:</strong> '+esc(f.interval):'')+'</div>'+
  '<div class="p-chart">'+svg(data,f.type)+'</div><p class="p-note"><strong>Total occurrences:</strong> '+data.total+' across '+data.observations+' observed dates. Only recorded observations are plotted. Missing dates do not mean zero behavior. Combined sources may overlap and are not deduplicated.</p>'+
  '<h2 style="font-size:13px;color:#10396c">Frequency details</h2><table class="p-data"><thead><tr><th>'+(f.type==='line'?'Time period':'Behavior')+'</th><th>Occurrences</th></tr></thead><tbody>'+bodyRows+'</tbody></table>'+
  '<div class="p-foot">COMPASS Student Support · Behavior Frequency Graph</div></main></body></html>';
 const win=w.open('','_blank','width=940,height=1120');if(!win){w.alert('Allow pop-ups to print the behavior graph.');return;}
 win.document.open();win.document.write(html);win.document.close();win.focus();
}
function mount(pane){
 if(!pane||pane.querySelector('#compassBehaviorGraphPrinting'))return;
 if(!$('compassBehaviorGraphPrintStyles')){const style=d.createElement('style');style.id='compassBehaviorGraphPrintStyles';style.textContent=CSS;d.head.appendChild(style);}
 const box=d.createElement('article');box.className='bgp-card';box.id='compassBehaviorGraphPrinting';
 box.innerHTML='<div class="bgp-top"><div><h3>Behavior Graphs · Print Section</h3><p class="bgp-muted">Choose a behavior and chart format. Line = recorded frequency over time; bar = total frequency by behavior. Prints on a separate portrait page.</p></div><div class="bgp-actions"><button type="button" id="bgpRefresh">Refresh Data</button><button type="button" id="bgpPrint" class="primary">Print Behavior Graph</button></div></div>'+
  '<div class="bgp-fields">'+
  '<label>Graph style<select id="bgpType"><option value="line">Line · Timeline</option><option value="bar">Bar · Frequency</option></select></label>'+
  '<label>Data source<select id="bgpSource"><option value="sessions">Program sessions</option><option value="manual">Manual trials</option><option value="log">Behavior log</option><option value="all">All sources (may overlap)</option></select></label>'+
  '<label>Behavior<select id="bgpBehavior"><option value="all">All behaviors</option></select></label>'+
  '<label>Timeline grouping<select id="bgpInterval"><option value="day">Daily</option><option value="week" selected>Weekly</option><option value="month">Monthly</option></select></label>'+
  '<label>From<input id="bgpFrom" type="date"></label><label>To<input id="bgpTo" type="date"></label></div>'+
  '<div class="bgp-meta" id="bgpStatus" role="status">Select Refresh Data to load the selected student’s behavior records.</div>'+
  '<div class="bgp-chart" id="bgpPreview"><div class="bgp-empty">Behavior chart preview appears here.</div></div>'+
  '<p class="bgp-muted">Frequency is the number of recorded occurrences, not a probability. Missing dates are not counted as zero. All Sources can include overlapping entries.</p>';
 pane.appendChild(box);
 for(const id of ['bgpType','bgpSource','bgpBehavior','bgpInterval','bgpFrom','bgpTo'])box.querySelector('#'+id).addEventListener('change',refreshed);
 box.querySelector('#bgpRefresh').addEventListener('click',load);
 box.querySelector('#bgpPrint').addEventListener('click',print);
 if(w.__compassProgressSnapshot?.studentId)load();
}
function sync(){
 const pane=$('compassGraphsChartsPane');if(pane){mount(pane);try{const c=context();if(cache.id!==c.sid)load();}catch(e){/* profile not yet ready */}}
}
d.addEventListener('DOMContentLoaded',sync);
w.addEventListener('compass-progress-data',sync);
w.CompassBehaviorGraphPrint={mount,load,print,summarize,svg};
})(window,document);
