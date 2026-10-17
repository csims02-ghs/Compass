// COMPASS Program Progress chart v1.
// Matches the requested Achieved / Goal / Behavior Rate time-series style.
(function(){
  function safeEsc(value){
    if(typeof esc==='function')return esc(value);
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]});
  }
  function fmtDay(value){
    const p=String(value||'').slice(0,10).split('-');
    return p.length===3?(Number(p[1])+'/'+Number(p[2])+'/'+p[0]):String(value||'');
  }
  function sessionDate(s){
    return String(s&& (s.session_date||s.ended_at||s.created_at) ||'').slice(0,10);
  }
  function renderProgramProgress(el,label,entries){
    if(!el||!label)return;
    if(!Array.isArray(entries)||!entries.length){
      label.textContent='No programs linked to IEP goals';
      el.innerHTML='<div class="chart-empty">No IEP-linked student programs are available.</div>';
      return;
    }
    const allSessions=(typeof state!=='undefined'&&Array.isArray(state.sessions))?state.sessions:[];
    let selected=entries.find(function(e){return String(e.sp&&e.sp.id||'')===String(el.dataset.programProgressId||'')});
    if(!selected)selected=entries.find(function(e){return e.trials>0})||entries[0];
    const selectedId=String(selected.sp&&selected.sp.id||'');
    el.dataset.programProgressId=selectedId;

    const byDay=new Map();
    allSessions.filter(function(s){return String(s.student_compass_program_id||'')===selectedId}).forEach(function(s){
      const date=sessionDate(s);if(!date)return;
      const cur=byDay.get(date)||{date:date,trials:0,correct:0,behaviors:0,sessions:0};
      cur.trials+=Number(s.trials_total||0);
      cur.correct+=Number(s.targets_correct||0);
      cur.behaviors+=Number(s.total_behaviors||0);
      cur.sessions+=1;
      byDay.set(date,cur);
    });
    const days=Array.from(byDay.values()).sort(function(a,b){return a.date.localeCompare(b.date)}).map(function(d){
      d.achieved=d.trials>0?Math.round((100*d.correct/d.trials)*10)/10:null;
      d.behaviorRate=Math.round(d.behaviors*100)/100;
      return d;
    });

    const options=entries.map(function(e){
      const id=String(e.sp&&e.sp.id||''),selectedAttr=id===selectedId?' selected':'';
      return '<option value="'+safeEsc(id)+'"'+selectedAttr+'>'+safeEsc(e.programName)+'</option>';
    }).join('');
    const selector='<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#17365d">Program <select id="compassProgramProgressSelect" style="min-width:240px;max-width:420px;border:1px solid #cbd7e6;border-radius:8px;padding:8px 10px;background:#fff;color:#17365d;font-weight:600">'+options+'</select></label>';

    if(!days.length){
      label.textContent=selected.programName+' · No session data yet';
      el.innerHTML='<div style="display:flex;justify-content:flex-end;margin-bottom:12px">'+selector+'</div><div class="chart-empty">No dated session data has been recorded for '+safeEsc(selected.programName)+' yet.</div>';
      const emptySelect=el.querySelector('#compassProgramProgressSelect');
      if(emptySelect)emptySelect.addEventListener('change',function(){el.dataset.programProgressId=this.value;renderProgramProgress(el,label,entries)});
      return;
    }

    const target=Math.max(0,Math.min(100,Number(selected.target)||0));
    const blue='#3f7ff5',red='#f04438',yellow='#f5ad00',grid='#d1d5db',ink='#202124',muted='#6b7280';
    const maxBehavior=Math.max.apply(null,days.map(function(d){return Number(d.behaviorRate)||0}).concat([0]));
    const rightMax=Math.max(4,Math.ceil(maxBehavior/2)*2);
    const left=78,right=72,top=100,plotBottom=390,plotH=235,bottom=115,step=88;
    const width=Math.max(1100,left+right+Math.max(2,days.length)*step),height=top+plotH+bottom,plotW=width-left-right;
    const cx=function(i){return days.length===1?left+plotW/2:left+(plotW*i/(days.length-1))};
    const yPct=function(v){return plotBottom-plotH*(Math.max(0,Math.min(100,Number(v)||0))/100)};
    const yBeh=function(v){return plotBottom-plotH*(Math.max(0,Math.min(rightMax,Number(v)||0))/rightMax)};

    const leftTicks=[0,25,50,75,100].map(function(v){
      const y=yPct(v);
      return '<line x1="'+left+'" y1="'+y+'" x2="'+(width-right)+'" y2="'+y+'" stroke="'+grid+'"/><text x="'+(left-10)+'" y="'+(y+5)+'" text-anchor="end" fill="'+ink+'" font-size="13">'+v.toFixed(2)+'%</text>';
    }).join('');
    const rightTicks=[0,1,2,3,4].map(function(i){
      const v=rightMax*i/4,y=yBeh(v);
      return '<text x="'+(width-right+12)+'" y="'+(y+5)+'" fill="'+ink+'" font-size="13">'+(Math.round(v*100)/100)+'</text>';
    }).join('');

    const achievedPts=days.map(function(d,i){return d.achieved==null?null:{x:cx(i),y:yPct(d.achieved),v:d.achieved,date:d.date}}).filter(Boolean);
    const achievedPath=achievedPts.length>1?'<polyline points="'+achievedPts.map(function(p){return p.x+','+p.y}).join(' ')+'" fill="none" stroke="'+blue+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>':'';
    const achievedDots=achievedPts.map(function(p){
      return '<g><circle cx="'+p.x+'" cy="'+p.y+'" r="4.5" fill="'+blue+'"><title>'+safeEsc(fmtDay(p.date)+' Achieved: '+p.v.toFixed(1)+'%')+'</title></circle><text x="'+p.x+'" y="'+(p.y-12)+'" text-anchor="middle" fill="'+blue+'" font-size="12.5" font-weight="700">'+p.v.toFixed(2)+'%</text></g>';
    }).join('');

    const behaviorPts=days.map(function(d,i){return {x:cx(i),y:yBeh(d.behaviorRate),v:d.behaviorRate,date:d.date}});
    const behaviorPath=behaviorPts.length>1?'<polyline points="'+behaviorPts.map(function(p){return p.x+','+p.y}).join(' ')+'" fill="none" stroke="'+yellow+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>':'';
    const behaviorDots=behaviorPts.map(function(p){
      return '<g><circle cx="'+p.x+'" cy="'+p.y+'" r="4.5" fill="'+yellow+'"><title>'+safeEsc(fmtDay(p.date)+' Behavior Rate: '+p.v)+'</title></circle><text x="'+p.x+'" y="'+(p.y+26)+'" text-anchor="middle" fill="'+yellow+'" font-size="12.5" font-weight="700">'+p.v+'</text></g>';
    }).join('');

    const goalY=yPct(target);
    const goalLine='<line x1="'+cx(0)+'" y1="'+goalY+'" x2="'+cx(days.length-1)+'" y2="'+goalY+'" stroke="'+red+'" stroke-width="3"/>';
    const dates=days.map(function(d,i){
      const x=cx(i);
      return '<text x="'+x+'" y="'+(plotBottom+30)+'" text-anchor="end" fill="'+ink+'" font-size="12.5" transform="rotate(-45 '+x+' '+(plotBottom+30)+')">'+safeEsc(fmtDay(d.date))+'</text>';
    }).join('');

    const legend='<div style="display:flex;justify-content:center;gap:24px;align-items:center;flex-wrap:wrap;margin:-4px 0 8px;font-size:13px;color:'+ink+'"><span style="display:inline-flex;align-items:center;gap:7px"><i style="width:20px;height:4px;background:'+blue+'"></i>Achieved</span><span style="display:inline-flex;align-items:center;gap:7px"><i style="width:20px;height:4px;background:'+red+'"></i>Goal</span><span style="display:inline-flex;align-items:center;gap:7px"><i style="width:20px;height:4px;background:'+yellow+'"></i>Behavior Rate</span></div>';
    const latest=days.slice().reverse().find(function(d){return d.achieved!=null});
    label.textContent=selected.programName+' · '+days.length+' session day'+(days.length===1?'':'s')+(latest?(' · Latest achieved '+latest.achieved.toFixed(1)+'%'):'')+' · Goal '+target.toFixed(0)+'%';

    el.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:6px"><div style="font-size:13px;color:'+muted+'">Progress by session date</div>'+selector+'</div><div style="font-size:25px;font-weight:400;color:#757575;margin:10px 0 6px">Achieved and Goal</div>'+legend+'<div class="compass-chart-scroll"><svg viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+'" role="img" aria-label="Program progress by date with achieved, goal, and behavior rate">'+leftTicks+rightTicks+'<line x1="'+left+'" y1="'+plotBottom+'" x2="'+(width-right)+'" y2="'+plotBottom+'" stroke="#4b5563"/>'+goalLine+achievedPath+achievedDots+behaviorPath+behaviorDots+dates+'</svg></div><div class="compass-chart-note">Achieved = independent correct trials ÷ total trials. Goal = the program goal percentage. Behavior Rate is the number of recorded behavior events for that session date, plotted on the right axis.</div>';
    const select=el.querySelector('#compassProgramProgressSelect');
    if(select)select.addEventListener('change',function(){el.dataset.programProgressId=this.value;renderProgramProgress(el,label,entries)});
  }

  window.compassRenderProgramProgress=renderProgramProgress;
  try{compassRenderProgramChart=renderProgramProgress}catch(error){console.warn('COMPASS program progress chart override unavailable',error)}

  function relabel(){
    const pane=document.getElementById('compassGraphsChartsPane');
    const h=pane&&pane.querySelector('h2');
    if(h)h.textContent='Program Progress';
  }
  relabel();
  setTimeout(function(){
    relabel();
    try{if(typeof renderGoalAchievement==='function'&&typeof state!=='undefined'&&state.currentStudent)renderGoalAchievement()}catch(error){console.warn('COMPASS program progress initial render skipped',error)}
  },0);
})();
