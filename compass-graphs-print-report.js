/* COMPASS Graphs > Print Section: read-only visual report of current graph data. */
(function(w,d){
'use strict';
const CSS="\n@page{size:letter portrait;margin:0}\n*{box-sizing:border-box}html,body{margin:0;padding:0;background:#eef3f8;color:#163456;font-family:Arial,Helvetica,sans-serif}\n.controls{max-width:8.5in;margin:10px auto;display:flex;justify-content:space-between;align-items:center;gap:10px;color:#627c97;font-size:10pt}\n.controls button{background:#164b7c;color:#fff;border:0;border-radius:5px;padding:9px 15px;cursor:pointer;font:700 10pt Arial}\n.sheet{width:8.5in;height:11in;margin:0 auto 16px;padding:.37in .41in .36in;background:#fff;display:flex;flex-direction:column;box-shadow:0 6px 19px #28405d22;overflow:hidden}\n.head{display:flex;justify-content:space-between;gap:14px;border-bottom:1.5pt solid #103558;padding-bottom:10pt;margin-bottom:12pt}\n.brand{font:800 18pt Arial;letter-spacing:-.6pt;color:#103558}.subbrand{font:400 6.8pt Arial;letter-spacing:1.1pt;color:#6c829b;margin-top:6pt}\n.title{text-align:right}.title h1{font:700 13.5pt Arial;color:#103558;margin:0 0 6pt}.title small{font:400 7pt Arial;color:#657d96}\n.identity{border:1px solid #dbe5ee;background:#f8fafc;border-radius:5pt;padding:9pt 10pt;margin-bottom:14pt}\n.identity strong{font:700 10pt Arial;color:#103558;display:block}.identity small{font:400 7pt Arial;color:#607891;display:block;margin-top:4pt}\n.box{border:1px solid #dbe5ee;border-radius:5pt;overflow:hidden;margin-bottom:13pt;break-inside:avoid}\n.box-heading{font:400 10pt Arial;background:#f2f6fa;color:#284b72;border-bottom:1px solid #dbe5ee;padding:7pt 10pt}\n.legend{display:flex;justify-content:center;align-items:center;gap:13pt;flex-wrap:wrap;margin:9pt 0 1pt;font:400 7.5pt Arial;color:#203b5b}\n.legend span{display:inline-flex;gap:4pt;align-items:center}.swatch{width:10pt;height:10pt;display:inline-block}.swatch.line{width:18pt;height:3pt;border-radius:2pt}\n.plot{padding:0 8pt 3pt}.plot svg{display:block;width:100%;height:auto;max-height:3.8in}\n.detail-title{font:400 10.5pt Arial;color:#163456;margin:0 0 6pt}\ntable{width:100%;border-collapse:collapse;table-layout:fixed;font:400 7.8pt Arial}\ncol:nth-child(1){width:34%}col:nth-child(2){width:11%}col:nth-child(3){width:13%}col:nth-child(4){width:25%}col:nth-child(5){width:17%}\nthead{display:table-header-group}\nth{background:#f2f6fa;text-align:left;color:#617993;padding:6pt 5pt;font:400 6.6pt/1.2 Arial;border-bottom:1px solid #d5e0ea}\ntd{vertical-align:middle;padding:7pt 5pt;border-bottom:1px solid #dde6ef;font:400 7.8pt/1.25 Arial;color:#1a385c}\ntd:not(:first-child){white-space:nowrap}tr:last-child td{border-bottom:0}\n.name{font:400 8.3pt Arial;color:#153454}.sub{font:400 6.8pt Arial;color:#70869c;margin-top:3pt}\n.note{font:400 7pt/1.4 Arial;color:#698198;margin:0}\n.foot{border-top:1pt solid #dce4eb;margin-top:auto;padding-top:8pt;display:flex;justify-content:space-between;color:#6c8398;font:400 7pt Arial}\n@media print{html,body{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}.controls{display:none!important}.sheet{margin:0;box-shadow:none;page-break-after:always;break-after:page}.sheet:last-child{page-break-after:auto;break-after:auto}tr,.box{break-inside:avoid!important}}\n";
const id=x=>d.getElementById(x);
const clean=x=>String(x==null?'':x).replace(/\s+/g,' ').trim();
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numeric=x=>{const n=parseFloat(clean(x).replace(/,/g,''));return Number.isFinite(n)?n:null};
const date=()=>{const x=new Date();return String(x.getMonth()+1).padStart(2,'0')+'/'+String(x.getDate()).padStart(2,'0')+'/'+x.getFullYear()};
function quick(label){
 const row=[...d.querySelectorAll('#quickInfo .quick-line')].find(e=>clean(e.querySelector('small')?.textContent).toLowerCase()===label.toLowerCase());
 return clean(row?.querySelector('strong')?.textContent)||'—';
}
function person(){return{name:clean(id('profileName')?.textContent)||'Student',
 code:clean(id('profileMeta')?.textContent).replace(/^Student ID:\s*/i,'')||'—',
 grade:quick('Grade'),school:quick('School'),classroom:quick('Classroom')}}
function capture(){
 const tbl=id('compassProgramChart')?.querySelector('.compass-chart-table');
 if(!tbl?.tBodies?.[0])return[];
 return [...tbl.tBodies[0].rows].map((r,i)=>{
  const c=[...r.cells];if(c.length<5)return null;
  const raw=clean([...c[0].childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' '));
  return {title:raw||clean(c[0].textContent)||'Entry '+(i+1),
   detail:clean(c[0].querySelector('div')?.textContent),
   goal:numeric(c[1].textContent),achieved:numeric(c[2].textContent),
   rate:numeric(c[3].textContent),events:clean(c[4].textContent)||'—'};
 }).filter(Boolean)
}
function wrap(s,limit=18){
 const words=clean(s).split(/\s+/),out=[];let curr='';
 for(const word of words){if(curr&&(curr+' '+word).length>limit){out.push(curr);curr=word}else curr=curr?curr+' '+word:word}
 if(curr)out.push(curr);
 return out.slice(0,3).map((x,i)=>x.length>26?x.slice(0,23)+'…':x);
}
function graph(rows,mode){
 const W=820,H=340,L=52,R=27,B=237,T=67,PH=B-T,space=(W-L-R)/rows.length;
 const maxRate=Math.max(1,Math.ceil(Math.max(0,...rows.map(r=>r.rate??0))*1.2*4)/4);
 const xp=i=>L+(i+.5)*space,yp=v=>B-PH*Math.max(0,Math.min(100,v))/100,yr=v=>B-PH*Math.max(0,v)/maxRate;
 const grid=[0,20,40,60,80,100].map(v=>'<line x1="'+L+'" y1="'+yp(v)+'" x2="'+(W-R)+'" y2="'+yp(v)+'" stroke="#dce5ed"/><text x="'+(L-8)+'" y="'+(yp(v)+4)+'" font-size="12" fill="#658099" text-anchor="end">'+v+'%</text>').join('');
 const points=[];
 const bars=rows.map((r,i)=>{
  const cx=xp(i),width=Math.min(33,space*.25),gap=5,blueX=cx-width-gap/2,redX=cx+gap/2;
  let part='';
  if(r.goal!=null){part+='<rect x="'+blueX+'" y="'+yp(r.goal)+'" width="'+width+'" height="'+(B-yp(r.goal))+'" rx="2.5" fill="#4285f4"/><text x="'+(blueX+width/2)+'" y="'+(yp(r.goal)-8)+'" fill="#4285f4" text-anchor="middle" font-size="12" font-weight="600">'+r.goal+'%</text>'}
  if(r.achieved!=null){part+='<rect x="'+redX+'" y="'+yp(r.achieved)+'" width="'+width+'" height="'+(B-yp(r.achieved))+'" rx="2.5" fill="#ea4335"/><text x="'+(redX+width/2)+'" y="'+(yp(r.achieved)-8)+'" fill="#ea4335" text-anchor="middle" font-size="12" font-weight="600">'+r.achieved.toFixed(1)+'%</text>'}
  if(r.rate!=null)points.push({x:cx,y:yr(r.rate),rate:r.rate});
  const lines=wrap(r.title,Math.min(18,Math.max(12,Math.floor(space/9))));
  part+=lines.map((s,j)=>'<text x="'+cx+'" y="'+(B+18+j*13)+'" fill="#17395d" text-anchor="middle" font-size="11">'+esc(s)+'</text>').join('');
  return part;
 }).join('');
 const path=points.length>1?'<polyline points="'+points.map(p=>p.x+','+p.y).join(' ')+'" stroke="#f4b400" stroke-width="3.5" stroke-linecap="round" fill="none"/>':'';
 const markers=points.map(p=>{const below=p.y<90,y=below?p.y+24:p.y-24;return '<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="#f4b400" stroke="#806600"/><rect x="'+(p.x-21)+'" y="'+y+'" width="42" height="18" rx="5" fill="#fff" stroke="#f4b400"/><text x="'+p.x+'" y="'+(y+13)+'" text-anchor="middle" fill="#17395d" font-size="12">'+p.rate.toFixed(2)+'</text>'}).join('');
 const labels='<text x="15" y="'+(T+PH/2)+'" text-anchor="middle" transform="rotate(-90 15 '+(T+PH/2)+')" fill="#17395d" font-size="11">Goal / Achievement %</text><text x="'+(W-7)+'" y="'+(T+PH/2)+'" text-anchor="middle" transform="rotate(-90 '+(W-7)+' '+(T+PH/2)+')" fill="#17395d" font-size="10">Events / trial</text><text x="'+W/2+'" y="'+(H-9)+'" text-anchor="middle" fill="#17395d" font-size="12">'+(mode==='iep'?'IEP Goals':'Student Programs')+'</text>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Goal achievement and combined behavior rate">'+grid+bars+path+markers+labels+'</svg>';
}
function render(rows,mode,p){
 const parts=[];for(let i=0;i<rows.length;i+=5)parts.push(rows.slice(i,i+5));if(!parts.length)parts.push([]);
 const title=mode==='iep'?'IEP Goal Progress':'Program Progress',detailTitle=mode==='iep'?'IEP Goal Details':'Program Details';
 const firstCol=mode==='iep'?'IEP GOAL / LINKED PROGRAMS':'PROGRAM / LINKED IEP GOALS';
 const meta=['Grade '+p.grade,p.school,p.classroom].map(esc).join(' &nbsp; · &nbsp; ');
 const sections=parts.map((set,i)=>{
  const rowsHtml=set.map(v=>'<tr><td><div class="name">'+esc(v.title)+'</div><div class="sub">'+esc(v.detail)+'</div></td><td>'+esc(v.goal==null?'—':v.goal+'%')+'</td><td>'+esc(v.achieved==null?'—':v.achieved.toFixed(1)+'%')+'</td><td>'+esc(v.rate==null?'—':v.rate.toFixed(2))+'</td><td>'+esc(v.events)+'</td></tr>').join('');
  return '<section class="sheet"><div class="head"><div><div class="brand">COMPASS</div><div class="subbrand">STUDENT SUPPORT</div></div><div class="title"><h1>Student Progress Report</h1><small>Graphs &amp; Charts · '+date()+'</small></div></div>'+
   '<div class="identity"><strong>'+esc(p.name)+' &nbsp; | &nbsp; ID '+esc(p.code)+'</strong><small>'+meta+'</small></div>'+
   '<div class="box"><div class="box-heading">'+title+(parts.length>1?' (continued)':'')+'</div>'+
   '<div class="legend"><span><i class="swatch" style="background:#4285f4"></i>'+(mode==='iep'?'IEP Goal':'Program Goal')+'</span><span><i class="swatch" style="background:#ea4335"></i>Achieved</span><span><i class="swatch line" style="background:#f4b400"></i>Combined Behavior Rate (recorded + user-confirmed)</span></div>'+
   '<div class="plot">'+graph(set,mode)+'</div></div>'+
   '<div class="detail-title">'+detailTitle+'</div><div class="box"><table><colgroup><col><col><col><col><col></colgroup><thead><tr><th>'+firstCol+'</th><th>GOAL</th><th>ACHIEVED</th><th>COMBINED RATE / TRIAL</th><th>COMBINED EVENTS</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div>'+
   '<p class="note">Combined Behavior Rate means recorded and user-confirmed behavior incidents per trial, not probability. Figures are taken from the selected COMPASS graph; overlapping observations have not been independently reconciled.</p>'+
   '<div class="foot"><span>COMPASS Student Support · '+rows.length+' '+(mode==='iep'?'IEP goals':'programs')+'</span><span>Page '+(i+1)+' of '+parts.length+'</span></div></section>';
 }).join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>COMPASS - '+esc(p.name)+' - Graphs Report</title><style>'+CSS+'</style></head><body><div class="controls"><span>COMPASS · Graphs & Charts</span><button type="button" onclick="window.print()">Print / Save as PDF</button></div>'+sections+'</body></html>';
}
function print(){
 const snap=w.__compassProgressSnapshot,ctx=w.COMPASS_MANUAL_BRIDGE?.context?.();
 if(!snap?.studentId||!ctx?.currentStudentId||String(snap.studentId)!==String(ctx.currentStudentId)){
  w.alert('Select and finish loading a student profile before printing.');return}
 if(id('compassGraphsChartsPane')?.hidden){w.alert('Open the Graphs tab first.');return}
 const data=capture();if(!data.length){w.alert('Graph data has not loaded yet.');return}
 const mode=id('compassGraphsModeSelect')?.value==='iep'?'iep':'program';
 const html=render(data,mode,person()),win=w.open('','_blank','width=930,height=1150');
 if(!win){w.alert('Allow pop-ups to print the COMPASS graph.');return}
 win.document.open();win.document.write(html);win.document.close();win.focus();
 setTimeout(()=>{if(!win.closed)try{win.print()}catch(e){console.warn('Graph print dialog unavailable',e)}},200);
}
d.addEventListener('click',e=>{if(e.target?.closest?.('#printStudentGraphsSectionBtn'))print()});
w.CompassGraphsPrint={render,capture,graph,print};
})(window,document);