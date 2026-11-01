(function(){
"use strict";
if(window.__compassProgressUIv1)return;window.__compassProgressUIv1=true;
const d=document;
const E=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const dt=v=>String(v||"").slice(0,10);
const shortDate=v=>{let a=dt(v).split("-");return a.length===3?Number(a[1])+"/"+Number(a[2])+"/"+a[0]:"—"};
const mon=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthKey=s=>dt(s).slice(0,7);
const dateFrom=s=>{const a=dt(s).split("-").map(Number);return new Date(a[0],(a[1]||1)-1,a[2]||1)};
const iso=x=>[x.getFullYear(),String(x.getMonth()+1).padStart(2,"0"),String(x.getDate()).padStart(2,"0")].join("-");
const addMonths=(s,m)=>{let a=dateFrom(s);return iso(new Date(a.getFullYear(),a.getMonth()+m,1))};
const monthEnd=s=>{let a=dateFrom(s);return iso(new Date(a.getFullYear(),a.getMonth()+1,0))};
const fmtMonth=s=>{let a=dateFrom(s);return mon[a.getMonth()]+" "+a.getFullYear()};
const sel=id=>d.getElementById("cpr-"+id);
let snap=null,currentStudent="",active=false, hidden=[],initialized=false,phasePreview=[];
let picks={program:"all",target:"all",benchmark:"all",period:"",customFrom:"",customTo:""};
function style(){
if(d.getElementById("cpr-styles"))return;
const tag=d.createElement("style");tag.id="cpr-styles";tag.textContent=
'.cpr-panel{background:#fff;border:1px solid #dbe5ef;border-radius:18px;padding:20px;margin:16px 0;color:#17365d;max-width:100%;min-width:0;font:15px Arial,Helvetica,sans-serif}' +
'.cpr-panel *{box-sizing:border-box}.cpr-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.cpr-title{font-size:27px;font-weight:800;color:#133760;margin:0 0 4px}.cpr-muted{color:#65788e;font-size:12px;line-height:1.5}' +
'.cpr-controls{display:grid;grid-template-columns:repeat(4,minmax(160px,1fr));gap:12px;margin:15px 0}.cpr-controls label,.cpr-custom label,.cpr-phases label{font-size:11px;color:#607795;display:block;font-weight:700;letter-spacing:.03em;text-transform:uppercase;margin-bottom:5px}' +
'.cpr-panel select,.cpr-panel input{width:100%;padding:10px;border-radius:9px;border:1px solid #bdcce0;background:white;color:#17365d;font-weight:650;font:inherit;min-width:0}.cpr-panel select:disabled,.cpr-panel input:disabled{background:#344355;color:#d5dbe4}' +
'.cpr-custom,.cpr-phases,.cpr-viewhead{background:#f7faff;border:1px solid #d9e3ef;border-radius:12px;padding:13px;margin:12px 0}.cpr-row{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end}' +
'.cpr-viewhead{display:flex;justify-content:space-between;gap:15px;align-items:center;flex-wrap:wrap}.cpr-viewhead select{max-width:360px}.cpr-phases .cpr-row{grid-template-columns:1.25fr 1fr 1.8fr auto}' +
'.cpr-btn{background:#183960;border:0;color:#fff;font-weight:700;border-radius:9px;padding:11px 15px;cursor:pointer}.cpr-btn:disabled{background:#91a0b0}.cpr-graph-title{font-size:25px;color:#737373;margin:21px 0 8px}.cpr-legend{display:flex;gap:23px;justify-content:center;flex-wrap:wrap;margin:4px 0 10px;color:#303942;font-size:13px}' +
'.cpr-line{display:inline-block;width:20px;height:4px;vertical-align:middle;margin-right:7px}.cpr-scroll{max-width:100%;overflow-x:auto;overflow-y:hidden}.cpr-scroll svg{display:block;max-width:none}.cpr-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0}.cpr-stat{border:1px solid #e0e7f0;background:#fafcff;border-radius:9px;padding:10px}.cpr-stat strong{font-size:18px;display:block}.cpr-stat small{color:#68798d}' +
'.cpr-tablewrap{overflow:auto;border:1px solid #dbe4ef;border-radius:10px;margin:12px 0}.cpr-table{border-collapse:collapse;width:100%;font-size:12px}.cpr-table th,.cpr-table td{padding:9px 10px;border-bottom:1px solid #e8eef5;text-align:left;white-space:nowrap}.cpr-table th{background:#f2f6fb;color:#637b96;font-size:11px;text-transform:uppercase}.cpr-table td:first-child{font-weight:650;color:#17365d}.cpr-sec-title{font-size:20px;font-weight:800;margin:22px 0 5px}.cpr-warning{background:#fff9eb;color:#8a5611;padding:12px;border-radius:9px;font-size:13px}.cpr-suppressed{display:none!important}.cpr-panel[hidden]{display:none!important}' +
'@media(max-width:1050px){.cpr-controls{grid-template-columns:repeat(2,minmax(0,1fr))}.cpr-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.cpr-controls,.cpr-row,.cpr-phases .cpr-row,.cpr-stats{grid-template-columns:1fr}}';
tag.textContent+="\n/* Progress tab: color-coded benchmark progress replaces compact Acquisition Summary. */\n.cpr-bench-sheet{margin:18px 0 10px;font:12px Arial,Helvetica,sans-serif;color:#133b65;min-width:0}\n.cpr-bench-head{background:linear-gradient(105deg,#07365b,#064e7c);color:white;border-radius:12px;padding:15px 18px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}\n.cpr-bench-head h2{font-size:clamp(20px,2.2vw,30px);margin:0;color:white}\n.cpr-bench-head p{font-size:12px;color:#deebf7;margin:6px 0 0}\n.cpr-bench-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center}\n.cpr-bench-meta label{font-weight:700;font-size:11px;color:#eef6ff}\n.cpr-bench-meta span{background:white;color:#123d68;border-radius:5px;padding:6px 10px;font-size:11px;display:inline-block}\n.cpr-bench-scroll{overflow-x:hidden;max-width:100%;width:100%;min-width:0}\n.cpr-bench-cols{width:100%;table-layout:fixed;min-width:0;border-collapse:collapse}\n.cpr-bench-cols col.cpr-col-num{width:4%}\n.cpr-bench-cols col.cpr-col-skill{width:28%}\n.cpr-bench-cols col.cpr-col-date{width:6%}\n.cpr-bench-cols col.cpr-col-maint{width:7%}\n.cpr-bench-cols col.cpr-col-notes{width:16%}\n.cpr-bench-cols th,.cpr-bench-cols td{border:1px solid #b9d1e7;padding:6px 2px;overflow-wrap:anywhere;min-width:0;line-height:1.2;font-size:clamp(8px,.85vw,11px);text-align:center;white-space:normal}\n.cpr-bench-cols th:first-child{font-weight:850}\n.cpr-bench-cols .cpr-left{text-align:left;padding-left:7px;font-weight:750}\n.cpr-bench-cols .cpr-topmain{background:#08395d;color:#fff}\n.cpr-bench-cols .cpr-intro{background:#a8d9fa}\n.cpr-bench-cols .cpr-mastered{background:#a9ebc5}\n.cpr-bench-cols .cpr-maint1{background:#ffe5a7}\n.cpr-bench-cols .cpr-maint2{background:#ffd9b8}\n.cpr-bench-cols .cpr-subintro{background:#e6f5ff}\n.cpr-bench-cols .cpr-submastered{background:#e5f9ed}\n.cpr-bench-cols .cpr-submaint1{background:#fff3d9}\n.cpr-bench-cols .cpr-submaint2{background:#fff0e3}\n.cpr-bench-group{margin:9px 0 0;border:1px solid var(--bench-border);border-radius:10px;overflow:hidden;background:var(--bench-bg)}\n.cpr-bench-group.blue{--bench-head:#cceaff;--bench-border:#91cafa;--bench-bg:#eff8ff}\n.cpr-bench-group.green{--bench-head:#c7efda;--bench-border:#87d9af;--bench-bg:#effcf5}\n.cpr-bench-group.gold{--bench-head:#ffebbe;--bench-border:#f2c064;--bench-bg:#fff9ea}\n.cpr-bench-group.rose{--bench-head:#ffdade;--bench-border:#f7a1ab;--bench-bg:#fff2f4}\n.cpr-bench-group summary{list-style:none;display:flex;align-items:center;gap:10px;background:var(--bench-head);padding:12px;min-height:44px;cursor:pointer;touch-action:manipulation}\n.cpr-bench-group summary::-webkit-details-marker{display:none}\n.cpr-bench-group summary:focus-visible{outline:3px solid #2477de;outline-offset:-3px}\n.cpr-bench-arrow{display:inline-flex;align-items:center;justify-content:center;flex:0 0 20px;font-weight:900;font-size:18px;color:#1a5f9c}\n.cpr-bench-group[open] .cpr-bench-arrow{transform:rotate(90deg)}\n.cpr-bench-title{font-weight:900;font-size:13px;flex:1;min-width:0}\n.cpr-bench-number{font-size:11px;color:#376181;font-weight:800;white-space:nowrap}\n.cpr-bench-group .cpr-bench-cols{background:var(--bench-bg)}\n.cpr-bench-group .cpr-bench-cols tr:nth-child(even){background:rgba(255,255,255,.4)}\n.cpr-bench-key{border:1px solid #d3e0ee;border-radius:9px;background:#f0f6fc;padding:12px;margin-top:11px;font-size:11px;color:#395b7d;line-height:1.55}\n.cpr-bench-empty{color:#9bb3c8}\n@media(max-width:850px){.cpr-bench-cols th,.cpr-bench-cols td{font-size:8px;padding:5px 1px}.cpr-bench-head{padding:12px}.cpr-bench-meta{gap:4px}}\n";
d.head.appendChild(tag);
}
function assignmentPrograms(){
return (snap&&Array.isArray(snap.programs)?snap.programs:[]).map(x=>{
let a=x.assignment||x,def=x.definition||{},cfg=Object.assign({},def.program_config||{},a.instance_config||{});
return {id:a.id, assignment:a, definition:def, config:cfg, name:def.program_name||a.program_name||"Program", goal:n(a.goal_percentage)??n(cfg.mastery_pct),targets:Array.isArray(cfg.targets)?cfg.targets:[],criteria:masteryCriteria(cfg),start:dt(a.start_date||a.assigned_date||a.created_at)};
}).sort((a,b)=>(n(a.assignment.display_order)??999)-(n(b.assignment.display_order)??999)||a.name.localeCompare(b.name));
}

/* Progress dropdown: one option per logical program, not one per archived assignment.
   Keep every assignment ID for historical session/target aggregation. This does not
   delete, archive, or mutate any student program or clinical record. */
function programs(){
 const groups=new Map();
 for(const p of assignmentPrograms()){
  const key=String(p.assignment.program_id||p.definition.id||p.definition.program_code||'assignment:'+p.id);
  if(!groups.has(key))groups.set(key,{primary:p,records:[]});
  const group=groups.get(key);
  group.records.push(p);
  const oldArchived=String(group.primary.assignment.status||'').toLowerCase()==='archived';
  const newActive=String(p.assignment.status||'').toLowerCase()!=='archived';
  if(oldArchived&&newActive)group.primary=p;
 }
 return [...groups.values()].map(group=>{
  const p=group.primary,assignmentIds=[...new Set(group.records.map(x=>String(x.id)))];
  const targets=[],seen=new Set();
  for(const entry of [p,...group.records.filter(x=>x.id!==p.id)]){
   for(const target of entry.targets){
    const key=String(target.key||target.id||target.target_key||target.name||'');
    if(key&&!seen.has(key)){targets.push(target);seen.add(key)}
   }
  }
  const dates=group.records.map(x=>x.start).filter(Boolean).sort();
  return {...p,assignmentIds,targets,start:dates[0]||p.start};
 }).sort((a,b)=>(n(a.assignment.display_order)??999)-(n(b.assignment.display_order)??999)||a.name.localeCompare(b.name));
}
function memberIds(p){return (p&&p.assignmentIds)||[String(p?.id||'')]}
function matchesProgram(programId,assignmentId){
 if(programId==='all')return true;
 const program=programs().find(p=>p.id===programId||memberIds(p).includes(String(programId)));
 return program?memberIds(program).includes(String(assignmentId)):String(assignmentId)===String(programId);
}
function masteryCriteria(cfg){
const mastery=cfg.mastery||cfg.mastery_criteria||{};
let days=n(mastery.days??mastery.consecutive_days??cfg.mastery_days??cfg.days_to_master);
let trials=n(mastery.probes_required??cfg.probes_required??cfg.mastery_probes??cfg.min_trials);
let threshold=n(mastery.percent??mastery.percentage??cfg.mastery_pct);
return {days:days&&days>0?Math.floor(days):null,probes:trials&&trials>0?Math.floor(trials):null,percent:threshold!=null?threshold:null};
}
function events(){
const allowed=new Set(assignmentPrograms().map(p=>String(p.id)));
const detail=(Array.isArray(snap&&snap.trialEvents)?snap.trialEvents:[]),bySession=new Map();
for(const row of detail){if(!bySession.has(row.session_id))bySession.set(row.session_id,[]);bySession.get(row.session_id).push(row)}
const live=(Array.isArray(snap&&snap.sessions)?snap.sessions:[]).filter(s=>allowed.has(String(s.student_compass_program_id))).flatMap(s=>{
const raw=bySession.get(s.id)||[],targets=raw.filter(ev=>ev.trial_type==='T'),total=Number(s.trials_total||0);
const targetCorrect=targets.filter(ev=>ev.result==='independent_correct').length,
 promptedCorrect=targets.filter(ev=>ev.result==='prompted').length,
 incorrect=targets.filter(ev=>ev.result==='incorrect').length,
 noResponse=targets.filter(ev=>ev.result==='no_response').length;
const verified=total>0&&targets.length===total&&
 targetCorrect===Number(s.targets_correct||0)&&promptedCorrect===Number(s.prompted_correct||0)&&
 incorrect===Number(s.incorrect||0)&&noResponse===Number(s.no_response||0);
if(verified){
 const source=s.source_record||{},phase=String(source.phase||source.session_type||source.scoring_phase||'').toLowerCase();
 let firstTarget=true;
 return raw.map(ev=>{
   const distractor=ev.trial_type==='D';
   const explicitMaintenance=/maintenance/.test(phase);
   const first=!distractor&&firstTarget;if(first)firstTarget=false;
   const name=String(ev.target_name||s.target_name||'Unspecified target').trim();
   const key=String(ev.target_key||s.target_key||name).trim();
   return {date:dt(ev.occurred_at||s.session_date),program:s.student_compass_program_id,key,name,
     benchmark:ev.benchmark_key||source.benchmark||source.benchmark_name||null,
     valid:true,trial:1,correct:ev.result==='independent_correct'?1:0,prompt:ev.result==='prompted'?1:0,
     beh:first?Number(s.total_behaviors||0):0,raw:s,
     probe:/probe|baseline/.test(phase)||source.v25_run?.probe===true,maintenance:distractor||explicitMaintenance,
     hasBehavior:!distractor,explicitMaintenance:!distractor&&explicitMaintenance};
 });
}
const t=n(s.trials_total),correct=n(s.targets_correct),prompt=n(s.prompted_correct),beh=n(s.total_behaviors),src=s.source_record||{};
const valid=t!=null&&t>0&&correct!=null&&correct>=0&&correct<=t&&(prompt==null||correct+prompt<=t);
const named=String(s.target_name||src.target_name||"").trim(),key=String(s.target_key||src.target_key||s.target_id||named||"").trim();
const mark=src.benchmark||src.benchmark_name||src.benchmark_label||src.benchmark_id||null;
const phase=String(src.phase||src.session_type||src.scoring_phase||"").toLowerCase();
return {date:dt(s.session_date||s.started_at||s.created_at),program:s.student_compass_program_id,key:key,name:named||key||"Unspecified target",benchmark:mark!=null?String(mark):null,
 valid,trial:valid?t:0,correct:valid?correct:0,prompt:valid?(prompt||0):0,beh:beh!=null&&beh>=0?beh:null,raw:s,
 probe:/probe|baseline/.test(phase)||src.v25_run?.probe===true,maintenance:/maintenance/.test(phase),hasBehavior:beh!=null&&beh>=0,explicitMaintenance:/maintenance/.test(phase)};
});
const manual=(Array.isArray(snap?.manualTrials)?snap.manualTrials:[])
 .filter(m=>allowed.has(String(m.student_compass_program_id))&&!m.deleted_at&&m.trial_type==='T')
 .flatMap(m=>{
  const counts=m.behavior_counts&&typeof m.behavior_counts==='object'?m.behavior_counts:{};
  const behaviorTotal=Object.values(counts).reduce((sum,n)=>sum+Math.max(0,Number(n)||0),0);
  const targetSteps=Array.isArray(m.chain_steps)&&m.chain_steps.length
   ?m.chain_steps.filter(step=>step.trial_type==='T'&&['independent','prompted','incorrect','no_response'].includes(step.response))
   :['independent','prompted','incorrect','no_response'].includes(m.response)?[{response:m.response}]:[];
  return targetSteps.map((step,i)=>({
   date:dt(m.event_date),program:m.student_compass_program_id,
   key:String(m.target_key||m.target_name||''),name:String(m.target_name||m.target_key||'Manual target'),
   benchmark:m.benchmark_key||null,valid:true,trial:1,
   correct:step.response==='independent'?1:0,prompt:step.response==='prompted'?1:0,
   beh:i===0?behaviorTotal:0,hasBehavior:i===0,raw:m,manual:true,
   probe:m.chain_type==='probe',maintenance:false,explicitMaintenance:false
  }));
 });
return [...live,...manual].filter(x=>/^\d{4}-\d\d-\d\d$/.test(x.date)).sort((a,b)=>a.date.localeCompare(b.date));
}
function currentEvents(){
let arr=events(),p=picks.program;
if(p!=="all")arr=arr.filter(s=>matchesProgram(p,s.program));
if(p!=="all"&&picks.target!=="all")arr=arr.filter(s=>s.key===picks.target);
if(p!=="all"&&picks.benchmark!=="all")arr=arr.filter(s=>s.benchmark===picks.benchmark);
let r=range();
return arr.filter(s=>s.date>=r.from&&s.date<=r.to);
}
function range(){
if(picks.period.startsWith("window:")){const x=picks.period.split(":");return {from:x[1],to:x[2],byMonth:true}}
if(picks.period.startsWith("month:")){const m=picks.period.slice(6);return {from:m+"-01",to:monthEnd(m+"-01"),byMonth:false}}
if(picks.period==="custom"&&picks.customFrom&&picks.customTo)return {from:picks.customFrom,to:picks.customTo,byMonth:picks.program==="all"};
const ds=events().filter(e=>matchesProgram(picks.program,e.program)).map(e=>e.date),fallback=programs().find(p=>p.id===picks.program);
const from=(ds.length?ds[0]:(fallback&&fallback.start)||iso(new Date())).slice(0,7)+"-01";
return {from,to:monthEnd(addMonths(from,11)),byMonth:true};
}
function option(value,label,selected){return '<option value="'+E(value)+'"'+(selected?' selected':'')+'>'+E(label)+'</option>'}
function refreshOptions(resetPeriod){
let ps=programs(),p=picks.program;
if(p!=="all"){const match=ps.find(x=>x.id===p||memberIds(x).includes(String(p)));picks.program=match?match.id:"all";}
sel("program").innerHTML=option("all","All Programs",picks.program==="all")+ps.map(x=>option(x.id,x.name,picks.program===x.id)).join("");
p=picks.program;
let arr=events().filter(e=>matchesProgram(p,e.program));
let current=ps.find(x=>x.id===p);
let targets=[],seen=new Set();
if(current){
 for(const x of current.targets){let k=String(x.key||x.id||x.target_key||x.name||"");if(k&&!seen.has(k)){targets.push({id:k,name:String(x.name||k)});seen.add(k)}}
 for(const x of arr){if(x.key&&!seen.has(x.key)){targets.push({id:x.key,name:x.name});seen.add(x.key)}}
}
sel("target").disabled=p==="all";sel("benchmark").disabled=p==="all";
sel("target").innerHTML=option("all","N/A",picks.target==="all")+targets.map(x=>option(x.id,x.name,picks.target===x.id)).join("");
if(!targets.some(x=>x.id===picks.target))picks.target="all";
let benchmarks=[...new Set(arr.map(x=>x.benchmark).filter(Boolean))];
for(const b of (current&&Array.isArray(current.config.benchmarks)?current.config.benchmarks:[])){let v=String(b.name||b.title||b.id||"");if(v&&!benchmarks.includes(v))benchmarks.push(v)}
sel("benchmark").innerHTML=option("all","N/A",picks.benchmark==="all")+benchmarks.map(x=>option(x,x,picks.benchmark===x)).join("");
if(!benchmarks.includes(picks.benchmark))picks.benchmark="all";
let ds=arr.map(x=>x.date).sort();let first=(ds[0]||(current&&current.start)||iso(new Date())).slice(0,7)+"-01";
let last=(ds.at(-1)||first).slice(0,7)+"-01";
const ranges=[];
for(let s=first,i=0;s<=last&&i<120;s=addMonths(s,12),i++){
 const e=monthEnd(addMonths(s,11));
 ranges.push({id:"window:"+s+":"+e,label:i===0?"From Introduction · 12 Months":fmtMonth(s)+" – "+fmtMonth(e)});
}
let monthly=[...new Set(arr.map(x=>monthKey(x.date)))].sort();
const currentPeriod=resetPeriod?"":picks.period;
const options=[...ranges.slice(0,1),{id:"custom",label:"Custom Date Range"},...ranges.slice(1),...monthly.map(m=>({id:"month:"+m,label:fmtMonth(m+"-01")}))];
if(resetPeriod||!options.some(x=>x.id===currentPeriod))picks.period=options[0]?options[0].id:"custom";
sel("period").innerHTML=options.map(x=>option(x.id,x.label,x.id===picks.period)).join("");
sel("phaseReason").disabled=p==="all";sel("phaseDate").disabled=p==="all";sel("phaseNote").disabled=p==="all";sel("phaseAdd").disabled=p==="all";
dateInputs();
}
function dateInputs(){
const r=range();sel("dateFrom").value=picks.period==="custom"&&picks.customFrom?picks.customFrom:r.from;sel("dateTo").value=picks.period==="custom"&&picks.customTo?picks.customTo:r.to;
}
function aggregate(){
const rows=currentEvents().filter(x=>x.valid&&!x.maintenance),r=range();
let groups=[];
if(r.byMonth){
 let start=r.from.slice(0,7)+"-01";
 for(let k=start,i=0;k<=r.to&&i<240;k=addMonths(k,1),i++)groups.push({key:k.slice(0,7),label:fmtMonth(k),items:rows.filter(x=>monthKey(x.date)===k.slice(0,7))});
}else{
 const map=new Map();
 rows.forEach(x=>{if(!map.has(x.date))map.set(x.date,[]);map.get(x.date).push(x)});
 groups=[...map].map(([key,items])=>({key,label:shortDate(key),items})).sort((a,b)=>a.key.localeCompare(b.key));
}
const defs=new Map(programs().map(x=>[x.id,x]));
return groups.map(g=>{
const trial=g.items.reduce((t,x)=>t+x.trial,0),correct=g.items.reduce((t,x)=>t+x.correct,0);
const targetTotal=g.items.reduce((t,x)=>t+x.trial*(defs.get(x.program)?.goal??0),0),withGoal=g.items.reduce((t,x)=>t+(defs.get(x.program)?.goal!=null?x.trial:0),0);
const behaviorItems=g.items.filter(x=>x.hasBehavior),behaviorTrials=behaviorItems.reduce((t,x)=>t+x.trial,0),behaviorEvents=behaviorItems.reduce((t,x)=>t+x.beh,0);
return {key:g.key,label:g.label,runs:g.items.length,ach:trial?100*correct/trial:null,goal:withGoal?targetTotal/withGoal:null,behavior:behaviorTrials?behaviorEvents/behaviorTrials:null,trial,correct,behaviorEvents};
});
}
function phases(){
if(picks.program==="all")return[];
let es=events().filter(e=>matchesProgram(picks.program,e.program)&&e.valid&&!e.maintenance),found=[],prev=null;
const observedTargets=new Set(),observedBenchmarks=new Set();
for(const e of es){
 if(prev){
  if(e.benchmark&&prev.benchmark&&e.benchmark!==prev.benchmark&&!observedBenchmarks.has(e.benchmark))found.push({date:e.date,type:"New Benchmark",text:"Benchmark: "+e.benchmark});
  if(e.key&&prev.key&&e.key!==prev.key&&!observedTargets.has(e.key))found.push({date:e.date,type:"New Target",text:"Target: "+e.name});
 }
 if(e.key)observedTargets.add(e.key);
 if(e.benchmark)observedBenchmarks.add(e.benchmark);
 prev=e
}
return [...found,...phasePreview.filter(x=>x.program===picks.program)].filter(x=>x.date>=range().from&&x.date<=range().to);
}
function graph(){
let g=aggregate(),r=range(),phase=phases();
const W=g.length<=24?1200:Math.max(1200,g.length*52+160),L=80,R=70,T=Math.max(140,90+phase.length*24),H=300,B=120,base=T+H,width=W-L-R,hh=T+H+B;
const mx=Math.max(1,...g.map(x=>x.behavior||0));const ymax=Math.max(1,Math.ceil(mx*4)/4);
const x=i=>L+(g.length===1?width/2:g.length?width*i/(g.length-1):width/2);
const y=v=>base-H*Math.max(0,Math.min(100,v||0))/100,by=v=>base-H*Math.max(0,Math.min(ymax,v||0))/ymax;
let svg='<svg width="'+(g.length<=24?"100%":W)+'" height="'+hh+'" viewBox="0 0 '+W+' '+hh+'" role="img" aria-label="Achieved, goal and behavior rate by date">';
for(let t=0;t<=100;t+=25){let yy=y(t);svg+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#d4dce6"/><text x="'+(L-9)+'" y="'+(yy+5)+'" text-anchor="end" font-size="14" fill="#4c5e72">'+t.toFixed(2)+'%</text>'}
for(let j=0;j<5;j++){let v=ymax*j/4;svg+='<text x="'+(W-R+11)+'" y="'+(by(v)+5)+'" font-size="13" fill="#4c5e72">'+v.toFixed(2)+'</text>'}
for(const [key,col,fun] of [["ach","#4285f4",y],["goal","#ea4335",y],["behavior","#f4b400",by]]){
let path="";
for(let i=0;i<g.length;i++){const v=g[i][key];if(v==null){path="";continue}path+=(path?" L":"M")+x(i).toFixed(1)+" "+fun(v).toFixed(1);let next=g[i+1]&&g[i+1][key];if(next==null&&path){svg+='<path d="'+path+'" stroke="'+col+'" fill="none" stroke-width="3.5"/>';path=""}}
if(path)svg+='<path d="'+path+'" stroke="'+col+'" fill="none" stroke-width="3.5"/>';
}
const markers=phase.map((p,i)=>{
let ix=r.byMonth?g.findIndex(z=>z.key===monthKey(p.date)):g.findIndex(z=>z.key>=p.date);
return {ix,p,i};
}).filter(z=>z.ix>=0);
let used=[];
for(const m of markers){
let xx=x(m.ix),level=used.filter(u=>Math.abs(u.x-xx)<172).length;used.push({x:xx});
let yy=Math.max(15,T-68-level*22);
svg+='<line x1="'+xx+'" y1="'+(T-12)+'" x2="'+xx+'" y2="'+base+'" stroke="#7c3aed" stroke-width="2" stroke-dasharray="6 5"/><text x="'+Math.min(W-R-4,Math.max(L+4,xx))+'" y="'+yy+'" text-anchor="middle" font-size="11" font-weight="700" fill="#6d28d9">'+E(m.p.text).slice(0,27)+'</text>';
}
g.forEach((v,i)=>{
const xx=x(i),size=g.length>20?9:12;
if(v.ach!=null){svg+='<circle cx="'+xx+'" cy="'+y(v.ach)+'" r="3.7" fill="#4285f4"/><text x="'+xx+'" y="'+(y(v.ach)-13)+'" text-anchor="middle" font-size="'+size+'" font-weight="700" fill="#4285f4">'+v.ach.toFixed(1)+'%</text>'}
if(v.behavior!=null){svg+='<circle cx="'+xx+'" cy="'+by(v.behavior)+'" r="3.7" fill="#f4b400"/><text x="'+xx+'" y="'+(by(v.behavior)+22)+'" text-anchor="middle" font-size="'+size+'" font-weight="700" fill="#db9f00">'+v.behavior.toFixed(2)+'</text>'}
svg+='<text x="'+xx+'" y="'+(base+25)+'" transform="rotate(-55 '+xx+' '+(base+25)+')" text-anchor="end" font-size="'+(g.length>19?9:12)+'" fill="#334155">'+E(v.label)+'</text>';
});svg+='</svg>';
sel("chart").innerHTML='<div class="cpr-graph-title">Achieved and Goal</div><div class="cpr-legend"><span><i class="cpr-line" style="background:#4285f4"></i>Achieved</span><span><i class="cpr-line" style="background:#ea4335"></i>Goal</span><span><i class="cpr-line" style="background:#f4b400"></i>Behavior Rate</span><span><i class="cpr-line" style="background:#7c3aed;width:3px;height:17px"></i>Phase Line</span></div><div class="cpr-scroll">'+svg+'</div><div class="cpr-muted" style="text-align:center">Behavior Rate = recorded behavior events ÷ trials; missing observations do not count as zero.</div>';
let trials=g.reduce((t,x)=>t+x.trial,0),correct=g.reduce((t,x)=>t+x.correct,0),bf=g.filter(x=>x.behavior!=null),btrial=bf.reduce((t,x)=>t+x.trial,0),btotal=bf.reduce((t,x)=>t+x.behaviorEvents,0);
sel("stats").innerHTML=[["Achieved",trials?(correct*100/trials).toFixed(1)+"%":"—"],["Goal",g.some(x=>x.goal!=null)?(g.filter(x=>x.goal!=null).reduce((t,x)=>t+x.goal,0)/g.filter(x=>x.goal!=null).length).toFixed(1)+"%":"—"],["Behavior rate",btrial?(btotal/btrial).toFixed(2):"—"],["Recorded program runs",g.reduce((t,x)=>t+x.runs,0)]].map(z=>'<div class="cpr-stat"><strong>'+E(z[1])+'</strong><small>'+E(z[0])+'</small></div>').join("");
sel("history").innerHTML=phase.length?phase.map(z=>'<tr><td>'+E(shortDate(z.date))+'</td><td>'+E(z.type)+'</td><td>'+E(z.text)+'</td><td>'+E(z.preview?"Preview only · not saved":"Detected from sessions")+'</td></tr>').join(""):'<tr><td colspan="4">No recorded phase changes in this date range.</td></tr>';
}
function calculateTargets(p){
const members=new Set(memberIds(p));
const es=events().filter(x=>members.has(String(x.program))&&x.valid).sort((a,b)=>a.date.localeCompare(b.date));
let targetMap=new Map();
for(const t of p.targets){const key=String(t.key||t.id||t.target_key||t.name||"");if(key)targetMap.set(key,{key,name:t.name||key,metadata:t.metadata||{}})}
for(const ev of es)if(ev.key&&!targetMap.has(ev.key))targetMap.set(ev.key,{key:ev.key,name:ev.name,metadata:{}});
const crit=p.criteria;
return [...targetMap.values()].map(t=>{
const all=es.filter(e=>e.key===t.key);
const base=all.filter(e=>!e.maintenance&&!e.probe&&!e.manual); // Historical manual entry requires clinical validation before mastery.
const probes=all.filter(e=>e.probe);
const byday=new Map();base.forEach(e=>{let o=byday.get(e.date)||{date:e.date,trials:0,correct:0};o.trials+=e.trial;o.correct+=e.correct;byday.set(e.date,o)});
let qualifying=[],mastered=null;
for(const o of [...byday.values()].sort((a,b)=>a.date.localeCompare(b.date))){
const pass=(crit.percent!=null&&o.trials>0&&(100*o.correct/o.trials)>=crit.percent)&&(crit.probes==null||o.trials>=crit.probes);
if(pass&&!qualifying.includes(o.date))qualifying.push(o.date);
if(crit.days!=null&&qualifying.length>=crit.days){mastered=o.date;break}
}
const maint=mastered?all.filter(e=>e.explicitMaintenance&&e.date>mastered).sort((a,b)=>a.date.localeCompare(b.date)):[];
const maintDays=[...new Set(maint.map(e=>e.date))].slice(0,2).map(date=>{const day=maint.filter(e=>e.date===date),trial=day.reduce((a,x)=>a+x.trial,0),correct=day.reduce((a,x)=>a+x.correct,0);return {date,score:trial?(100*correct/trial).toFixed(0)+"%":null}});
return {name:t.name,key:t.key,probe:probes.length?probes[0].date:null,introduced:base.length?base[0].date:null,mastered,maintenance:maintDays[0]?.date||null,maintenance1:maintDays[0]||null,maintenance2:maintDays[1]||null,
 metadata:t.metadata||{},qualifying:qualifying.length,criterion:crit.days&&crit.percent!=null,
 bench:t.metadata?.benchmark_name||t.metadata?.benchmark||t.metadata?.number_band||base.find(e=>e.benchmark)?.benchmark||null};
});
}
function acquisition(options={}){
 const ps=programs(),chosen=options.assignmentId?assignmentPrograms().filter(p=>p.id===options.assignmentId):(picks.program==="all"?ps:ps.filter(p=>p.id===picks.program));
 const colgroup='<colgroup><col class="cpr-col-num"><col class="cpr-col-skill">'+
  Array(4).fill('<col class="cpr-col-date">').join('')+
  Array(4).fill('<col class="cpr-col-maint">').join('')+
  '<col class="cpr-col-notes"></colgroup>';
 // Accurate, source-derived tracking, not fabricated dates/initials.
 function cell(v){return v!=null&&String(v).trim()?E(String(v)):'<span class="cpr-bench-empty">—</span>'}
 function compact(v){if(!v)return null;const a=String(v).slice(0,10).split('-');return a.length===3?(Number(a[1])+'/'+Number(a[2])+'/'+a[0].slice(-2)):null}
 const all=chosen.map(p=>{
  const rows=calculateTargets(p),grouped=new Map();
  for(const row of rows){
   let key=String(row.bench||"Unassigned benchmark"),m=/^\d+\s*-\s*\d+$/.exec(key),
    label=m?('Targets '+key):key;
   if(!grouped.has(label))grouped.set(label,[]);
   grouped.get(label).push(row);
  }
  return {p,rows,grouped};
 });
 const tables=all.map(z=>{
  let counter=0;
  const allDates=z.rows.flatMap(x=>[x.introduced,x.mastered,x.maintenance1?.date,x.maintenance2?.date]).filter(Boolean).sort();
  const range=allDates.length?shortDate(allDates[0])+' – '+shortDate(allDates.at(-1)):'Not recorded';
  const title='<header class="cpr-bench-head"><div><h2>'+E(z.p.name)+'</h2><p>COMPASS · Benchmark Skills & Acquisition Progress</p></div>'+
   '<div class="cpr-bench-meta"><label>Student:</label><span>'+E(snap?.studentName||'Selected student')+'</span>'+
   '<label>Date Range:</label><span>'+E(range)+'</span></div></header>';
  const head='<table class="cpr-bench-cols" aria-label="Progress tracking column names">'+colgroup+
   '<thead><tr><th rowspan="2" class="cpr-topmain">#</th><th rowspan="2" class="cpr-topmain">Skill / Target</th>'+
   '<th colspan="2" class="cpr-intro">Introduced</th><th colspan="2" class="cpr-mastered">Mastered</th>'+
   '<th colspan="2" class="cpr-maint1">Maintenance 1</th><th colspan="2" class="cpr-maint2">Maintenance 2</th>'+
   '<th rowspan="2" class="cpr-topmain">Notes</th></tr>'+
   '<tr><th class="cpr-subintro">Date</th><th class="cpr-subintro">Initials</th>'+
   '<th class="cpr-submastered">Date</th><th class="cpr-submastered">Initials</th>'+
   '<th class="cpr-submaint1">Date</th><th class="cpr-submaint1">Score</th>'+
   '<th class="cpr-submaint2">Date</th><th class="cpr-submaint2">Score</th></tr></thead></table>';
  let sections=[...z.grouped].map(([key,rows],i)=>{
    const rowHTML=rows.map(t=>{
      counter++;const m=t.metadata||{};
      const introInitial=m.introduced_initials||m.introduced_by_initials||null,
       masteryInitial=m.mastered_initials||m.mastered_by_initials||null;
      const note=m.progress_note||m.tracking_note||m.notes||null;
      return '<tr><td>'+counter+'</td><td class="cpr-left">'+E(t.name)+'</td>'+
       '<td>'+cell(compact(t.introduced))+'</td><td>'+cell(introInitial)+'</td>'+
       '<td>'+cell(compact(t.mastered))+'</td><td>'+cell(masteryInitial)+'</td>'+
       '<td>'+cell(compact(t.maintenance1?.date))+'</td><td>'+cell(t.maintenance1?.score)+'</td>'+
       '<td>'+cell(compact(t.maintenance2?.date))+'</td><td>'+cell(t.maintenance2?.score)+'</td>'+
       '<td class="cpr-left">'+cell(note)+'</td></tr>';
    }).join('');
    const benchTitle=/^Benchmark\b/i.test(key)?key:'Benchmark '+(i+1)+': '+key;
    return '<details class="cpr-bench-group '+['blue','green','gold','rose'][i%4]+'" name="cpr-acquisition-bench">'+
      '<summary><span class="cpr-bench-arrow" aria-hidden="true">▸</span>'+
      '<span class="cpr-bench-title">'+E(benchTitle)+'</span><span class="cpr-bench-number">'+rows.length+' targets</span></summary>'+
      '<table class="cpr-bench-cols" aria-label="'+E(benchTitle)+'">'+colgroup+'<tbody>'+rowHTML+'</tbody></table></details>';
  }).join('');
  return '<div class="cpr-bench-sheet">'+title+'<div class="cpr-bench-scroll">'+head+sections+'</div>'+
    '<div class="cpr-bench-key">I = Introduced · M = Mastered · M1 = Maintenance 1 · M2 = Maintenance 2. '+
    'Only supported session and target evidence is shown. Distractor responses never count as maintenance. '+
    'Blank dates and initials mean not recorded. Mastery requires distinct qualifying instructional dates and recorded criteria.</div></div>';
 }).join('');
 const html=tables||'<div class="cpr-warning">No program acquisition records are available.</div>';
 if(options.htmlOnly)return html;
 sel("acquisition").innerHTML=html;
 // Exclusive-open fallback for browsers without native shared details groups.
 sel("acquisition").querySelectorAll('details.cpr-bench-group').forEach(group=>{
  group.addEventListener('toggle',()=>{
   if(!group.open)return;
   sel("acquisition").querySelectorAll('details.cpr-bench-group').forEach(other=>{if(other!==group&&other.open)other.open=false});
  });
 });
}
function redraw(){if(!sel("chart"))return;graph()}
function scaffold(){
const host=d.getElementById("profile-tab-progress");
if(!host)return null;
let panel=sel("liveView");
if(!panel){
style();panel=d.createElement("section");panel.id="cpr-liveView";panel.className="cpr-panel";panel.hidden=false;
panel.innerHTML='<div class="cpr-head"><div><div class="cpr-title">Program Progress</div><div class="cpr-muted">Live program sessions · linked to this student profile</div></div></div>'+
'<div class="cpr-controls"><div><label>Program</label><select id="cpr-program"></select></div><div><label>Target</label><select id="cpr-target"></select></div><div><label>Benchmark</label><select id="cpr-benchmark"></select></div><div><label>Time Range</label><select id="cpr-period"></select></div></div>'+
'<div class="cpr-custom"><strong>Custom Date Range</strong><div class="cpr-row"><div><label>From</label><input type="date" id="cpr-dateFrom"/></div><div><label>To</label><input type="date" id="cpr-dateTo"/></div><button class="cpr-btn" id="cpr-apply">Show Range</button></div></div>'+

'<div class="cpr-phases"><strong>Insert Phase Line</strong><div class="cpr-row"><div><label>Reason</label><select id="cpr-phaseReason"><option>New Benchmark</option><option>New Target</option><option>Prompting/Teaching Change</option><option>Reinforcement Change</option><option>Other Clinical Change</option></select></div><div><label>Date</label><input type="date" id="cpr-phaseDate"/></div><div><label>Optional Note</label><input id="cpr-phaseNote" placeholder="What changed?"/></div><button class="cpr-btn" id="cpr-phaseAdd">Preview phase line</button></div><div class="cpr-muted">Manual phase lines are preview-only until persistent clinical event storage is configured.</div></div>'+
'<div id="cpr-chart"></div><div class="cpr-stats" id="cpr-stats"></div><div class="cpr-sec-title">Phase Line History</div><div class="cpr-tablewrap"><table class="cpr-table"><thead><tr><th>Date</th><th>Phase</th><th>Detail</th><th>Source</th></tr></thead><tbody id="cpr-history"></tbody></table></div>';
 host.replaceChildren(panel);
 panel.addEventListener("change",e=>{
let id=e.target&&e.target.id;if(!id)return;
if(id==="cpr-program"){picks.program=e.target.value;picks.target="all";picks.benchmark="all";refreshOptions(true);redraw()}
else if(id==="cpr-target"){picks.target=e.target.value;redraw()}
else if(id==="cpr-benchmark"){picks.benchmark=e.target.value;redraw()}
else if(id==="cpr-period"){picks.period=e.target.value;dateInputs();redraw()}

});
panel.addEventListener("click",e=>{
let id=e.target&&e.target.id;
if(id==="cpr-apply"){const a=sel("dateFrom").value,b=sel("dateTo").value;if(a&&b){picks.customFrom=a<b?a:b;picks.customTo=a<b?b:a;picks.period="custom";sel("period").value="custom";redraw()}}
if(id==="cpr-phaseAdd"&&picks.program!=="all"&&sel("phaseDate").value){phasePreview.push({program:picks.program,date:sel("phaseDate").value,type:sel("phaseReason").value,text:sel("phaseReason").value+(sel("phaseNote").value?" — "+sel("phaseNote").value:""),preview:true});sel("phaseNote").value="";redraw()}
});
}
return {panel,host};
}
// Read-only program-specific sheet API for Student Profile > Assigned Programs.
// Snapshot is supplied by that profile, and this synchronous scope restores
// the Progress tab's existing student context and filters afterward.
window.compassAcquisitionDataForProgram=function(assignmentId,profileSnapshot){
 if(!assignmentId||!profileSnapshot?.studentId||
   !Array.isArray(profileSnapshot.programs)||
   !profileSnapshot.programs.some(x=>(x.assignment||x).id===assignmentId))return null;
 const previousSnap=snap,previousPicks=picks;
 try{
  snap=profileSnapshot;picks={...picks,program:assignmentId};
  return acquisition({assignmentId,htmlOnly:true});
 }finally{snap=previousSnap;picks=previousPicks}
};
function restore(){active=false;}
function activate(){
  const ctx=scaffold();if(!ctx)return;
  active=true;ctx.panel.hidden=false;
  if(!snap){
    const chart=sel("chart");
    if(chart)chart.innerHTML='<div class="cpr-muted" role="status" style="padding:22px 0">Loading student program sessions and linked IEP goals…</div>';
    return;
  }
  refreshOptions(!initialized);initialized=true;redraw();
}
d.addEventListener("click",e=>{
const b=e.target.closest&&e.target.closest("button,[role=tab]");if(!b)return;
const tx=String(b.textContent||"").trim().toLowerCase();
if(tx==="progress"){activate()}
else if(["overview","graphs and charts","iep & services","programs","goals","behavior","assessments","observation & session notes","documents","team","history"].includes(tx)){restore()}
},true);
window.addEventListener("compass-progress-data",()=>{
const s=window.__compassProgressSnapshot;if(!s)return;
if(currentStudent!==s.studentId){currentStudent=s.studentId;picks={program:"all",target:"all",benchmark:"all",period:"",customFrom:"",customTo:""};initialized=false;phasePreview=[]}
snap=s;if(active)activate();
});
scaffold();
if(window.__compassProgressSnapshot)window.dispatchEvent(new Event("compass-progress-data"));
})();