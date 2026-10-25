/* COMPASS Student Profile | One-page portrait report.
   Uses only the selected student's in-memory records supplied by the authenticated profile.
   No sample values, no external document assets and no server-side report storage. */
(function(global){
  'use strict';
  const domains=[
    'Academic Development',
    'Communication & Language',
    'Cognitive & Learning Development',
    'Executive Functioning & Behavior',
    'Social-Emotional & Play Development',
    'Adaptive & Independent Living',
    'Motor & Sensory Development',
    'Technology & Transition Readiness'
  ];
  const safe=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>{const x=String(v||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(x))return '—';const [y,m,d]=x.split('-');return m+'/'+d+'/'+y};
  const percent=(a,b)=>b>0?Math.max(0,Math.min(100,Math.round(100*a/b))):null;
  const showPct=v=>Number.isFinite(v)?Math.round(v)+'%':'—';
  const count=v=>Array.isArray(v)?v.length:0;
  const cfg=p=>Object.assign({},p?.definition?.program_config||{},p?.assignment?.instance_config||{});
  function groupFor(p){
    const c=cfg(p),explicit=String(c.reporting_domain||c.eight_domain||c.primary_domain||'').trim().toLowerCase();
    const existing=domains.find(d=>d.toLowerCase()===explicit);
    if(existing)return existing;
    const text=String([p?.definition?.program_name,c.domain,c.sub_domain,c.program_type,c.skill_type].filter(Boolean).join(' ')).toLowerCase();
    // Provisional name-based grouping. Unclear programs remain unclassified; never manufacture a score.
    if(/typing|keyboard|touchscreen|digital|technology|computer|workplace|vocational|career|employment|job skill|transition readiness/.test(text))return domains[7];
    if(/gross motor|fine motor|scissor|cutting|motor imitation|sensory|hand strength|motor coordination/.test(text))return domains[6];
    if(/\baac\b|communication|receptive language|expressive language|speech|echoic|vocal|conversation|asking for help|requesting|wh question|listening/.test(text))return domains[1];
    if(/executive|regulation|coping|self.control|behavior|attention|on.task|impulse|following classroom direction/.test(text))return domains[3];
    if(/social|emotion|play|friend|peer|sharing|turn taking|turn.taking|leisure selection/.test(text))return domains[4];
    if(/hygiene|handwash|dressing|clothing management|daily living|independent routine|visual schedule|self.care|functional living|food identification|community safety/.test(text))return domains[5];
    if(/working memory|problem.solving|categor|classif|matching|puzzle|before.after|cause.and.effect|inferenc|sequence concept|feature.function.class|spatial concept/.test(text))return domains[2];
    if(/reading|writing|letter|alphabet|word|math|number|count|phonics|spelling|division|addition|subtraction|measurement|sight word|geometry|tracing|science|history|social studies/.test(text))return domains[0];
    return null;
  }
  function derive(data){
    const active=(data.programs||[]).filter(p=>p?.assignment?.status==='active');
    const all=data.programs||[];
    const byId=new Map(all.map(p=>[p.assignment?.id,p]));
    const weeks=[4,8,12].includes(Number(data.weeks))?Number(data.weeks):4;
    const now=data.now?new Date(data.now):new Date();
    const end=now.getTime(),begin=end-weeks*7*86400000,previous=begin-weeks*7*86400000;
    const sessionDate=s=>Date.parse(String(s.session_date||s.created_at||'').slice(0,10)+'T12:00:00');
    const sessions=(data.sessions||[]).filter(s=>byId.has(s.student_compass_program_id)&&Number.isFinite(sessionDate(s)));
    const activeIds=new Set(active.map(p=>p.assignment.id));
    const current=sessions.filter(s=>activeIds.has(s.student_compass_program_id)&&sessionDate(s)>=begin&&sessionDate(s)<=end);
    const prior=sessions.filter(s=>activeIds.has(s.student_compass_program_id)&&sessionDate(s)>=previous&&sessionDate(s)<begin);
    const sum=(rows,k)=>rows.reduce((n,s)=>n+Math.max(0,Number(s[k])||0),0);
    const allGoals=(data.goals||[]).filter(g=>g.status==='active');
    const evaluable=allGoals.filter(g=>g.current_percent!==null&&g.current_percent!==undefined&&Number.isFinite(Number(g.current_percent)));
    const iep=evaluable.length?Math.round(evaluable.reduce((n,g)=>n+Math.min(100,100*Number(g.current_percent)/Math.max(1,Number(g.target_percent)||80)),0)/evaluable.length):null;
    const accuracy=percent(sum(current,'targets_correct'),sum(current,'trials_total'));
    const rate=rows=>sum(rows,'trials_total')>0?sum(rows,'total_behaviors')/sum(rows,'trials_total'):null;
    const r0=rate(prior),r1=rate(current);
    const trend=r0!==null&&r0>0&&r1!==null?Math.round(100*(r1-r0)/r0):null;
    const groups=domains.map(name=>{
      const matching=current.filter(s=>groupFor(byId.get(s.student_compass_program_id))===name);
      return {name,score:percent(sum(matching,'targets_correct'),sum(matching,'trials_total'))};
    });
    // Only verified target-trial results can establish the prompting denominator.
    const detailBySession=new Map();
    for(const e of data.trialEvents||[]){
      if(!detailBySession.has(e.session_id))detailBySession.set(e.session_id,[]);
      detailBySession.get(e.session_id).push(e);
    }
    let scored=0,assisted=0,complete=current.length>0;
    for(const s of current){
      const targets=(detailBySession.get(s.id)||[]).filter(e=>e.trial_type==='T');
      if(!Number(s.trials_total)||targets.length!==Number(s.trials_total)){complete=false;continue}
      for(const e of targets){
        const level=String(e.prompt_level||'').trim();
        const prompted=e.result==='prompted'||(level&&!/^(none|independent|no prompt)$/i.test(level));
        const independent=e.result==='independent_correct'||/^(none|independent|no prompt)$/i.test(level);
        if(!prompted&&!independent){complete=false;continue}
        scored++;
        if(prompted)assisted++;
      }
      if(Number(s.prompted_correct||0)>0&&!targets.some(e=>e.result==='prompted'||(e.prompt_level&&!/^(none|independent|no prompt)$/i.test(e.prompt_level))))complete=false;
    }
    const prompt=complete&&scored>0?percent(assisted,scored):null;
    const last=sessions.reduce((latest,s)=>sessionDate(s)>sessionDate(latest||{})?s:latest,null);
    const futureReviews=allGoals.map(g=>g.review_date).filter(Boolean).sort();
    const targetBehaviors=count(data.student?.selected_behaviors);
    return {weeks,current,iep,accuracy,trend,groups,prompt,scored,assisted,lastSession:last?.session_date||null,activeCount:active.length,goalCount:allGoals.length,targetBehaviors,review:futureReviews[0]||null,mastered:Number.isFinite(Number(data.masteredCount))&&data.masteredCount!==null?Number(data.masteredCount):null,unmappedCount:current.filter(s=>!groupFor(byId.get(s.student_compass_program_id))).length};
  }
  function render(data){
    if(!data||!data.student||!data.student.id)throw new Error('Student context required');
    const p=derive(data),student=data.student,school=data.school||'—',classroom=data.classroom||'—';
    const printedOn=date(data.printedDate||(data.now||new Date().toISOString()).slice(0,10));
    const value=v=>v===null||v===undefined||v===''?'—':safe(v);
    const tile=(label,v,note,bar=false)=>'<div class="kpi"><span class="tiny">'+safe(label)+'</span><strong>'+safe(v)+'</strong>'+(bar?'<div class="track"><span style="width:'+(Number.isFinite(numeric(v))?numeric(v):0)+'%"></span></div>':'<small>'+safe(note||'')+'</small>')+'</div>';
    const numeric=v=>Number.parseFloat(String(v));
    const cell=(label,v)=>'<div class="cell"><span>'+safe(label)+'</span><strong>'+value(v)+'</strong></div>';
    const domainMarkup=p.groups.map(row=>'<div class="domain-row"><span class="domain-name">'+safe(row.name)+'</span><div class="domain-bar"><span style="width:'+(row.score??0)+'%"></span></div><strong>'+showPct(row.score)+'</strong></div>').join('');
    const behavior=p.trend===null?'—':(p.trend<0?'↓ ':p.trend>0?'↑ ':'→ ')+Math.abs(p.trend)+'%';
    const grade=student.grade_level?'Grade '+student.grade_level:'Grade unavailable';
    const meta=[grade,school,classroom].filter(Boolean).map(safe).join(' &nbsp; · &nbsp; ');
    const footer='Calculated from saved student-specific records. "—" means insufficient or unavailable data. Domain assignments may be provisional when programs lack an explicit reporting domain. Prompt % uses verified, scored target trials only; no inference is made from missing prompt levels.';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
     '<title>COMPASS - '+safe(student.display_label||student.student_code||'Student')+' - Student Progress Report</title>'+
     '<style>'+
     ':root{--ink:#163456;--navy:#103558;--muted:#5e7490;--line:#dce4eb;--blue:#4778aa}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font:11px Arial,Helvetica,sans-serif;background:#edf3f8;color:var(--ink)}.toolbar{display:flex;justify-content:space-between;align-items:center;margin:14px auto 10px;max-width:8.5in;gap:8px;color:#546f8c}.toolbar button{border:0;border-radius:7px;background:#164b7c;color:white;padding:10px 16px;cursor:pointer;font-weight:bold}.sheet{width:8.5in;height:11in;padding:.37in .43in .29in;margin:0 auto 24px;background:#fff;box-shadow:0 8px 23px #1a395823;display:flex;flex-direction:column;overflow:hidden}.head{display:flex;align-items:start;justify-content:space-between;gap:12px;border-bottom:2px solid var(--navy);padding-bottom:10px}.brand{font-size:24px;font-weight:800;letter-spacing:-.7px;color:var(--navy)}.subbrand{font-size:9px;letter-spacing:1.2px;color:#6c829b;margin-top:4px}.report{text-align:right}.report h1{margin:0;font-size:19px;color:var(--navy)}.report small{font-size:9px;color:#627b95;display:block;margin-top:7px}.identity{border:1px solid var(--line);background:#f8fafc;border-radius:7px;margin-top:11px;padding:10px 11px;min-height:52px}.identity strong{font-size:13px;display:block;overflow-wrap:anywhere}.identity small{color:#637c95;display:block;font-size:9px;margin-top:5px;overflow-wrap:anywhere}h2{font-size:13px;color:var(--navy);margin:0 0 8px}.snapshot{margin-top:13px}.cells{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);border-radius:7px;padding:1px 10px}.cell{padding:7px 8px;min-height:41px;border-bottom:1px solid #e4eaf0}.cell:nth-child(n+4){border:0}.cell span{display:block;color:#657b91;font-size:9px}.cell strong{display:block;margin-top:4px;font-size:11.5px;color:var(--navy);overflow-wrap:anywhere}.overview{margin-top:15px}.intro{font-size:9.5px;color:#71869b;margin-top:-5px}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:10px}.kpi{min-height:82px;border:1px solid var(--line);border-radius:7px;padding:10px}.kpi .tiny{display:block;font-size:9.4px;font-weight:750;color:#41617e}.kpi strong{display:block;font-size:24px;line-height:1.15;margin-top:6px}.kpi small{display:block;font-size:8.4px;color:#617891;margin-top:8px}.track{height:6px;background:#e5eaf1;margin-top:10px;border-radius:5px;overflow:hidden}.track span{display:block;height:100%;background:#4478b0}.domains{margin-top:14px}.domains-head{border-top:1px solid var(--line);padding-top:11px;display:flex;justify-content:space-between;gap:10px;align-items:baseline}.domains-head small{font-size:9px;color:#607b97}.columns,.domain-row{display:grid;grid-template-columns:270px minmax(0,1fr) 45px;gap:13px;align-items:center}.columns{padding:0 8px 6px 4px;color:#6f859c;font-size:8px;text-transform:uppercase;letter-spacing:.7px}.columns span:last-child{text-align:right}.domain-row{min-height:43px;border-bottom:1px solid #e9eef3;padding:0 8px 0 4px}.domain-name{font-size:10.6px;font-weight:700;line-height:1.22}.domain-bar{height:9px;border-radius:7px;background:#e5ebf1;overflow:hidden}.domain-bar span{display:block;height:100%;background:#527eaf}.domain-row strong{text-align:right;font-size:11px}.bottom{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:14px}.stat{border:1px solid var(--line);border-radius:7px;padding:12px;min-height:82px}.stat small{font-size:10px;color:#345576;font-weight:700;display:block}.stat strong{font-size:25px;display:block;margin:5px 0}.stat em{color:#5d7690;font-size:9px;font-style:normal}.foot{border-top:1px solid var(--line);padding-top:10px;margin-top:auto;font-size:8px;color:#678096;display:flex;justify-content:space-between;gap:18px;line-height:1.42}.foot span{max-width:84%}.foot b{font-size:9px;white-space:nowrap}@page{size:letter portrait;margin:0}@media print{html,body{width:8.5in;height:11in;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none!important}.sheet{width:8.5in;height:11in;margin:0;box-shadow:none;page-break-after:auto;break-after:auto}}@media screen and (max-width:850px){.toolbar{padding:0 10px}.sheet{max-width:100%;height:auto;min-height:11in}.columns,.domain-row{grid-template-columns:minmax(140px,1fr) minmax(60px,.8fr) 40px;gap:7px}}</style></head><body>'+
     '<div class="toolbar"><span><strong>COMPASS · Student Progress Report</strong><br>US Letter · Portrait · 1 page</span><button type="button" onclick="window.print()">Print / Save as PDF</button></div>'+
     '<main class="sheet">'+
     '<header class="head"><div><div class="brand">COMPASS</div><div class="subbrand">STUDENT SUPPORT</div></div><div class="report"><h1>Student Progress Report</h1><small>Last '+p.weeks+' weeks &nbsp; · &nbsp; '+printedOn+'</small></div></header>'+
     '<section class="identity"><strong>'+safe(student.display_label||'Student')+' &nbsp; | &nbsp; ID '+safe(student.student_code||'—')+'</strong><small>'+meta+'</small></section>'+
     '<section class="snapshot"><h2>Student Support Snapshot</h2><div class="cells">'+
      cell('Primary Service',data.primaryService||'None entered')+
      cell('Active Programs',p.activeCount)+
      cell('IEP Goals Tracked',p.goalCount)+
      cell('Target Behaviors',p.targetBehaviors+' selected')+
      cell('Last Session',date(p.lastSession))+
      cell('Data Review',date(p.review))+
     '</div></section>'+
     '<section class="overview"><h2>Student Progress Overview</h2><div class="intro">Academic, behavioral and IEP performance at a glance</div><div class="kpis">'+
      tile('IEP Goal Progress',showPct(p.iep),'',true)+
      tile('Program Accuracy',showPct(p.accuracy),'',true)+
      tile('Behavior Trend',behavior,p.trend===null?'Insufficient comparable data':'Compared with previous '+p.weeks+' weeks')+
     '</div></section>'+
     '<section class="domains"><div class="domains-head"><h2>Progress by Domain</h2><small>8 focused domains</small></div><div class="columns"><span>Domain</span><span>Recorded accuracy</span><span>Score</span></div>'+domainMarkup+'</section>'+
     '<section class="bottom"><div class="stat"><small>Targets Mastered</small><strong>'+ (p.mastered===null?'—':p.mastered)+'</strong><em>Saved mastered-target statuses</em></div><div class="stat"><small>Prompt %</small><strong>'+showPct(p.prompt)+'</strong><em>'+(p.prompt===null?'Insufficient verified prompt data':p.assisted+' prompted / '+p.scored+' target trials')+'</em></div></section>'+
     '<footer class="foot"><span>'+safe(footer)+'</span><b>Page 1 of 1</b></footer>'+
     '</main></body></html>';
  }
  global.CompassStudentPrint={render,derive,domains:domains.slice()};
})(window);
