/* Student Profile > Print Report: one student-specific, four-section report.
 * Reuses the established Overview, Programs, and Graphs print renderers.
 * No hardcoded students, percentages, behaviors, or public data fetches.
 */
(function(w,d){
'use strict';
const byId=id=>d.getElementById(id);
const clean=x=>String(x==null?'':x).trim();
const escape=x=>clean(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const delay=n=>new Promise(resolve=>setTimeout(resolve,n));
let printing=false;

function confirmStudent(){
 const snap=w.__compassProgressSnapshot,ctx=w.COMPASS_MANUAL_BRIDGE?.context?.();
 const page=byId('page-student-profile');
 if(!snap?.studentId||!ctx?.currentStudentId||String(snap.studentId)!==String(ctx.currentStudentId)
    ||page?.classList.contains('compass-profile-loading')||page?.getAttribute('aria-busy')==='true')
  throw Error('Finish loading the selected student profile before printing.');
 return String(snap.studentId);
}
function safeStyle(source,prefix){
 const sheet=new CSSStyleSheet();
 sheet.replaceSync(source||'');
 function selectors(t){
  return t.split(',').map(s=>{
   s=s.trim();
   if(/^(html|body|:root)$/i.test(s))return prefix;
   s=s.replace(/^(?:html|body)\s+/i,'');
   return prefix+' '+s;
  }).join(',');
 }
 function rule(r){
  if(r.type===CSSRule.STYLE_RULE)return selectors(r.selectorText)+'{'+r.style.cssText+'}';
  // One global @page definition owns the merged four-page print job.
  if(r.type===CSSRule.PAGE_RULE)return '';
  if(r.type===CSSRule.MEDIA_RULE)return '@media '+r.conditionText+'{'+Array.from(r.cssRules).map(rule).join('')+'}';
  if(r.cssRules)return '@supports '+(r.conditionText||'')+'{'+Array.from(r.cssRules).map(rule).join('')+'}';
  return '';
 }
 return Array.from(sheet.cssRules).map(rule).join('\n');
}
function extract(src,part,expectCount){
 const doc=new DOMParser().parseFromString(src,'text/html');
 const style=doc.querySelector('style')?.textContent||'';
 const pages=Array.from(doc.querySelectorAll('.sheet'));
 if(!style||pages.length<expectCount)throw Error('A printable '+part+' section is missing.');
 return {css:safeStyle(style,'.report-'+part),html:pages.map(x=>x.outerHTML).join('\n'),pages:pages.length};
}
function printDocument(overviewHtml,programsHtml,graphsHtml,studentName){
 const overview=extract(overviewHtml,'overview',1);
 const programs=extract(programsHtml,'programs',1);
 const graphs=extract(graphsHtml,'graphs',1);
 const title=escape(studentName)+' - Student Progress Report';
 const styles=[
 '@page{size:letter portrait;margin:0}',
 'html,body{margin:0!important;padding:0!important;background:#f2f5f8;color:#163456;font-family:Arial,Helvetica,sans-serif}',
 '*{box-sizing:border-box}',
 '.report-part{width:8.5in;max-width:100%;margin:0 auto}',
 '.report-overview .sheet,.report-programs .sheet,.report-graphs .sheet{box-sizing:border-box}',
 '.print-tools{width:min(8.5in,100%);margin:10px auto;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;gap:12px;color:#526e88;font:12px Arial,sans-serif}',
 '.print-tools button{background:#164b7c;color:#fff;border:0;border-radius:7px;padding:10px 14px;cursor:pointer;font:700 12px Arial,sans-serif}',
 // Preserve the reference report's empty brand area, with Student Support below.
 '.report-part .brand{visibility:hidden!important}',
 '.report-overview .subbrand,.report-programs .subbrand,.report-graphs .subbrand{visibility:visible!important}',
 overview.css,programs.css,graphs.css,
 '@media print{',
 'html,body{width:8.5in;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
 '.print-tools{display:none!important}',
 '.report-part{max-width:none;width:8.5in;margin:0!important}',
 '.report-overview{break-after:page;page-break-after:always}',
 '.report-programs{break-after:page;page-break-after:always}',
 '.report-overview .sheet{width:8.5in!important;height:11in!important;min-height:11in!important;max-width:none!important;padding:.37in .43in .29in!important;margin:0!important;box-shadow:none!important;overflow:hidden!important;break-after:auto!important}',
 '.report-programs .sheet{width:8.5in!important;min-height:11in!important;height:auto!important;max-width:none!important;padding:.43in .43in .56in!important;margin:0!important;box-shadow:none!important;overflow:visible!important;break-after:auto!important}',
 '.report-programs thead{display:table-header-group!important}',
 '.report-programs tbody tr{break-inside:avoid!important;page-break-inside:avoid!important}',
 '.report-graphs .sheet{width:8.5in!important;height:11in!important;min-height:11in!important;max-width:none!important;padding:.37in .41in .36in!important;margin:0!important;box-shadow:none!important;break-after:auto!important}',
 '.report-overview .brand,.report-programs .brand,.report-graphs .brand{visibility:hidden!important}',
 '}'
 ].join('\n');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title>'+
 '<style>'+styles+'</style></head><body><div class="print-tools"><span>Student Support · Complete Student Progress Report</span>'+
 '<button type="button" onclick="window.print()">Print / Save as PDF</button></div>'+
 '<div class="report-part report-overview">'+overview.html+'</div>'+
 '<div class="report-part report-programs">'+programs.html+'</div>'+
 '<div class="report-part report-graphs">'+graphs.html+'</div></body></html>';
}
async function captureIepGraph(expectedId){
 const graph=w.CompassGraphsPrint,selector=byId('compassGraphsModeSelect');
 if(!graph?.render||!graph?.capture||!selector)throw Error('Graphs have not been initialized for the selected student.');
 const initial=selector.value;
 try{
  if(initial!=='iep'){selector.value='iep';selector.dispatchEvent(new Event('change',{bubbles:true}))}
  let rows=[];
  for(let i=0;i<15;i++){
   if(confirmStudent()!==expectedId)throw Error('Student changed while collecting graph data.');
   rows=graph.capture();
   if(rows.length)break;
   await delay(160);
  }
  const expected=(w.__compassProgressSnapshot?.goals||[]).filter(g=>g.status!=='discontinued').length;
  if(expected>0&&rows.length!==expected)
    throw Error('The IEP graph is not fully loaded. Open the Graphs tab and retry.');
  return rows;
 }finally{
  if(selector.value!==initial){selector.value=initial;selector.dispatchEvent(new Event('change',{bubbles:true}))}
 }
}
function makeReportError(win,msg){
 if(!win||win.closed)return;
 win.document.open();
 win.document.write('<!doctype html><html lang="en"><head><title>Report unavailable</title></head><body style="font:15px/1.5 Arial;padding:36px;color:#17365d"><h2>Student report not ready</h2><p>'+
  escape(msg)+'</p><p>No student report was printed. Please return to the Student Profile and retry.</p></body></html>');
 win.document.close();
}
async function printReport(){
 if(printing)return;
 let sid;
 try{sid=confirmStudent()}catch(err){w.alert(err.message);return}
 if(!w.CompassStudentPrint?.render||!w.CompassProgramsPrintReport?.prepareCombinedReport||!w.CompassGraphsPrint?.render||!w.CompassStudentReportContext){
  w.alert('One or more report components are still loading. Reload the Student Profile and retry.');return;
 }
 const win=w.open('','_blank','width=930,height=1150');
 if(!win){w.alert('Allow pop-ups to open the Student Report.');return}
 printing=true;
 win.document.open();win.document.write('<!doctype html><html><head><title>Preparing Student Report</title></head><body style="font:15px Arial;padding:32px;color:#163456">Preparing the selected student’s four-section report…</body></html>');win.document.close();
 try{
  // Graph mode is captured from the live chart, not reconstructed from stale data.
  const graphRows=await captureIepGraph(sid);
  const [overviewData,programData]=await Promise.all([
   w.CompassStudentReportContext(sid),
   w.CompassProgramsPrintReport.prepareCombinedReport(sid)
  ]);
  if(confirmStudent()!==sid||win.closed)throw Error('Student changed or the report window closed.');
  const overviewHtml=w.CompassStudentPrint.render(overviewData);
  const programsHtml=w.CompassProgramsPrintReport.render(programData);
  const graphPerson={
   name:programData.identity.name,code:programData.identity.code,
   grade:programData.identity.grade,school:programData.identity.school,classroom:programData.identity.classroom
  };
  const graphsHtml=w.CompassGraphsPrint.render(graphRows,'iep',graphPerson);
  const html=printDocument(overviewHtml,programsHtml,graphsHtml,programData.identity.name);
  win.document.open();win.document.write(html);win.document.close();win.focus();
  // Give the inline SVG chart and print stylesheet a chance to lay out.
  await new Promise(resolve=>{if(win.document.readyState==='complete')resolve();else win.addEventListener('load',resolve,{once:true})});
  if(!win.closed)setTimeout(()=>{try{win.print()}catch(e){console.warn('Print dialog unavailable',e)}},300);
 }catch(err){
  console.error('Combined student report could not be prepared',err);
  makeReportError(win,err?.message||'The selected student report could not be generated.');
 }finally{printing=false}
}
function bind(){
 const button=byId('printFullStudentReportBtn');
 if(button&&!button.dataset.combinedReportBound){
  button.dataset.combinedReportBound='1';button.addEventListener('click',printReport);
 }
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
w.StudentCombinedPrintReport={print:printReport,printDocument};
})(window,document);
