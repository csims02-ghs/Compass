/* COMPASS printable Student Profile section reports. Read-only and student-scoped.
 * Existing one-page Print Profile functionality is intentionally preserved. */
(function(){
'use strict';
const labels={overview:'Student Overview',iepservices:'IEP Services',programs:'Assigned Programs',graphs:'Graphs & Progress',notes:'Notes & Documents',goals:'IEP Goals',assessments:'Assessments',behavior:'Behavior Support',team:'Student Team',progress:'Program Progress',history:'Student History',docs:'Notes & Documents'};
const $=id=>document.getElementById(id);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const norm=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
function section(){
 const graph=$('compassGraphsChartsPane');
 if(graph&&!graph.hidden&&window.getComputedStyle(graph).display!=='none')return 'graphs';
 const button=document.querySelector('#profileTabs button[data-tab].active');
 if(button&&labels[button.dataset.tab])return button.dataset.tab;
 const pane=document.querySelector('#page-student-profile .profile-tab.active');
 const key=pane?.id?.replace(/^profile-tab-/,'');
 return labels[key]?key:'overview';
}
function info(){
 const rows={};document.querySelectorAll('#quickInfo .quick-line').forEach(row=>{
 const name=norm(row.querySelector('small')?.textContent).toLowerCase();
 if(name)rows[name]=norm(row.querySelector('strong')?.textContent)});
 let provider='—';try{provider=norm(window.COMPASS_MANUAL_BRIDGE?.context?.().providerName)||'—'}catch(_){}
 return {student:norm($('profileName')?.textContent)||'Student',id:norm($('profileMeta')?.textContent).replace(/^Student ID:\s*/i,'')||'—',grade:rows.grade||'—',school:rows.school||'—',classroom:rows.classroom||'—',status:norm($('profileStatus')?.textContent)||'—',provider};
}
function removeActionColumns(root){
 root.querySelectorAll('table').forEach(table=>{
 const heading=table.querySelector('thead tr');if(!heading)return;
 const columns=Array.from(heading.children).map((cell,i)=>/^(action|actions|manage)$/i.test(norm(cell.textContent))?i:-1).filter(i=>i>=0);
 table.querySelectorAll('tr').forEach(row=>{const cells=Array.from(row.children);columns.slice().reverse().forEach(i=>cells[i]?.remove())});
 });
}
function clean(root){
 // Forms and controls belong to the editing workspace, not a printed student report.
 root.querySelectorAll('#documentUploadForm').forEach(form=>form.closest('article')?.remove());
 root.querySelectorAll('form').forEach(x=>x.remove());
 root.querySelectorAll('[hidden],.hidden,[aria-hidden="true"],script,style,iframe,object,embed,video,audio,source').forEach(x=>x.remove());
 root.querySelectorAll('.compass-legacy-overview-data,.modal-backdrop,.compass-quick-student-switch').forEach(x=>x.remove());
 root.querySelectorAll('button.compass-doc-entry').forEach(button=>{
   const entry=document.createElement('div');entry.className='report-document';entry.textContent=norm(button.textContent);button.replaceWith(entry);
 });
 removeActionColumns(root);
 root.querySelectorAll('button,input,select,textarea,nav,[role="button"],[contenteditable]').forEach(x=>x.remove());
 root.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.removeAttribute('target');a.removeAttribute('download')});
 root.querySelectorAll('*').forEach(node=>Array.from(node.attributes).forEach(attr=>{if(/^on/i.test(attr.name)||attr.name==='contenteditable'||attr.name==='tabindex')node.removeAttribute(attr.name)}));
 root.querySelectorAll('.compass-chart-scroll').forEach(wrap=>{
 const svg=wrap.querySelector('svg');if(!svg)return;
 const parts=String(svg.getAttribute('viewBox')||'').split(/\s+/);
 const width=Number(svg.getAttribute('width'))||Number(parts[2])||0;
 if(width>2200&&root.querySelector('.compass-chart-table')){
  wrap.innerHTML='<p class="chart-note">The complete chart contains many items. The detailed report table below includes all reported values.</p>';
 }
 });
 root.querySelectorAll('svg').forEach(svg=>{svg.removeAttribute('width');svg.removeAttribute('height');svg.setAttribute('preserveAspectRatio','xMidYMid meet')});
 return root;
}
function contents(type){
 const sources=type==='graphs'?[$('compassGraphsChartsPane')]:type==='notes'?[$('profile-tab-notes'),$('profile-documents-section')]:[$('profile-tab-'+type)];
 const body=document.createElement('main');body.className='report-content';
 const selected=new Set();
 sources.forEach(source=>{
  if(!source||selected.has(source)||Array.from(selected).some(parent=>parent.contains(source)))return;
  selected.add(source);
  const copy=source.cloneNode(true);copy.removeAttribute('hidden');copy.classList.remove('hidden','profile-tab');copy.style.removeProperty('display');
  clean(copy);body.appendChild(copy);
 });
 if(!body.children.length)body.innerHTML='<p class="empty">No printable content is available for this section.</p>';
 return body;
}
const REPORT_STYLES="@page{size:letter __ORIENT__;margin:.58in}\n*{box-sizing:border-box}\nhtml,body{margin:0;background:#e9eff6;color:#183754;font:11px/1.45 Arial,Helvetica,sans-serif}\n.sheet{max-width:__WIDTH__;min-height:9in;margin:16px auto;padding:26px;background:#fff;box-shadow:0 3px 18px #0b28501c}\n.controls{max-width:__WIDTH__;margin:10px auto;display:flex;justify-content:space-between;gap:10px;align-items:center}\n.controls button{font:700 12px Arial;border:0;border-radius:6px;padding:11px 16px;background:#174575;color:#fff;cursor:pointer}\n.controls span{color:#58738b}\nheader.report-header{border-bottom:3px solid #18466f;padding-bottom:14px;margin-bottom:15px}\n.brandline{display:flex;justify-content:space-between;align-items:center}\n.brandline strong{font-size:19px;font-weight:900;letter-spacing:.08em;color:#103964}\n.brandline small{font-size:9px;color:#617c94;letter-spacing:.09em;text-transform:uppercase}\nh1{font-size:22px;line-height:1.2;margin:11px 0 4px;color:#103964}\n.report-deck{margin:0 0 12px;font-size:10px;color:#657c91}\n.report-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid #dce5ee;border-radius:5px;overflow:hidden}\n.report-meta>div{padding:7px 8px;border-right:1px solid #e6ebf1;border-bottom:1px solid #e6ebf1;min-width:0}\n.report-meta b{display:block;text-transform:uppercase;color:#5a7490;letter-spacing:.03em;font-size:8px}\n.report-meta span{display:block;font-size:10px;font-weight:650;overflow-wrap:anywhere}\n.report-content{max-width:100%;min-width:0}\nh2{font-size:14px;color:#154574;border-bottom:1px solid #d5e3ef;padding-bottom:6px;margin:3px 0 9px}\nh3{font-size:12px;margin:7px 0;color:#1a466d}\np{margin:5px 0 10px}p,td,th,span,div,strong,li{overflow-wrap:anywhere}\n.report-content>.profile-tab,.report-content>section,.report-content>div{margin:0 0 12px}\n.report-content .card,.report-content .panel,.report-content article,\n.report-content .stack-item,.report-content .goal-card,\n.report-content .compass-overview-kpi,.report-content .compass-overview-summary,\n.report-content .program-stat,.report-content .snapshot-row,.report-content .iep-evidence-row,\n.report-content .report-document{\n border:1px solid #dde7f0!important;border-radius:5px!important;background:#fff!important;box-shadow:none!important;\n margin:0 0 9px!important;padding:9px!important;overflow:visible!important;max-width:100%!important;min-width:0!important}\n.report-content .panel-head,.report-content .compass-overview-head{display:block!important}\n.report-content .overview-grid,.report-content .two-col,.report-content .overview-bottom,\n.report-content .compass-overview-three,.report-content .compass-overview-kpis,\n.report-content .compass-overview-bottom,.report-content .program-stat-grid,\n.report-content .goal-grid,.report-content .metric-grid{display:block!important;width:100%!important}\n.report-content .chart-area,.report-content .compass-chart-scroll,\n.report-content .compass-chart-table-wrap,.report-content .programs-table-wrap,\n.report-content .table-scroll,.report-content .timeline,.report-content .stack-list,\n.report-content .goal-grid{max-height:none!important;height:auto!important;overflow:visible!important;width:100%!important}\n.report-content svg{display:block;max-width:100%;height:auto}\n.report-content .compass-chart-scroll svg{width:100%!important;height:auto!important;max-height:4.1in}\n.report-content table{width:100%!important;border-collapse:collapse!important;font-size:9px!important;table-layout:auto!important;margin:9px 0}\n.report-content thead{display:table-header-group}\n.report-content tr{break-inside:avoid;page-break-inside:avoid}\n.report-content th,.report-content td{\n border:1px solid #dce5ee!important;padding:5px 6px!important;vertical-align:top!important;text-align:left!important;\n white-space:normal!important;min-width:0!important;background:#fff!important}\n.report-content th{font-size:8.5px!important;background:#edf3f9!important;color:#1c4e79!important;font-weight:750!important}\n.report-content .chart-note{border:1px dashed #b5c7d8;padding:9px;font-style:italic;color:#607890}\n.report-content .empty{font-style:italic;color:#6a7e92}\n.report-content button,.report-content select,.report-content input,.report-content textarea,.report-content nav{display:none!important}\n.report-content [hidden],.report-content .hidden{display:none!important}\nfooter.report-footer{border-top:1px solid #d4e1eb;margin-top:18px;padding-top:10px;font-size:9px;color:#5a7185}\n@media print{\n html,body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}\n .controls{display:none!important}.sheet{margin:0;padding:0;max-width:none;min-height:0;box-shadow:none}\n h1,h2,h3,h4{break-after:avoid;page-break-after:avoid}\n .report-content .card,.report-content .panel,.report-content article{break-inside:avoid-page}\n}";

function report(type,body,student){
 const title=type==='graphs'?(norm($('compassGraphModeHeading')?.textContent)||'Graphs & Progress'):labels[type]||'Student Profile';
 const date=new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'});
 const landscape=['programs','graphs','progress'].includes(type);
 const fields=[['Student',student.student],['Student ID',student.id],['Grade',student.grade],['School',student.school],['Classroom',student.classroom],['Status',student.status],['Prepared by',student.provider],['Prepared',date]];
 const meta=fields.map(([key,value])=>'<div><b>'+esc(key)+'</b><span>'+esc(value)+'</span></div>').join('');
 const style=REPORT_STYLES.replace(/__ORIENT__/g,landscape?'landscape':'portrait').replace(/__WIDTH__/g,landscape?'10in':'7.3in');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>COMPASS · '+esc(title)+' Report</title><style>'+style+'</style></head><body>'+
 '<div class="controls"><span>COMPASS student report · '+esc(title)+' · '+(landscape?'Landscape':'Portrait')+'</span><button type="button" onclick="window.print()">Print / Save as PDF</button></div>'+
 '<div class="sheet"><header class="report-header"><div class="brandline"><strong>COMPASS</strong><small>Student Support · Confidential Report</small></div>'+
 '<h1>'+esc(title)+' Report</h1><p class="report-deck">Student-specific record · '+esc(date)+'</p><div class="report-meta">'+meta+'</div></header>'+body.outerHTML+
 '<footer class="report-footer"><strong>Confidential student education record.</strong> For authorized educational use. Information reflects the records currently displayed in COMPASS. Review source evidence and professional judgment before making instructional or service decisions.</footer></div></body></html>';
}
function openReport(){
 const profile=$('page-student-profile');
 if(!profile||!$('profileName'))return;
 if(profile.classList.contains('compass-profile-loading')||profile.getAttribute('aria-busy')==='true'){
  window.alert('Finish loading this student profile before printing.');return;
 }
 const type=section(),student=info(),body=contents(type);
 const win=window.open('','_blank','width=1040,height=1150');
 if(!win){window.alert('Allow pop-ups to open the COMPASS section report.');return}
 try{
  win.document.open();win.document.write(report(type,body,student));win.document.close();win.focus();
 }catch(e){
  console.error('COMPASS section report could not be prepared',e);try{win.close()}catch(_){}
  window.alert('Unable to prepare this section for printing.');
 }
}
function setup(){
 const btn=$('printProfileSectionBtn');if(!btn||btn.dataset.sectionPrinterBound)return;
 btn.dataset.sectionPrinterBound='true';btn.addEventListener('click',openReport);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
window.CompassStudentSectionReport={section,info,contents,report,openReport};
})();
