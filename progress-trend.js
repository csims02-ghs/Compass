(function(){
  const PATCH_ID='compassProgressTrendV1';
  function escText(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function root(){return document.querySelector('#page-student-profile,#page-student,#studentProfile')||document}
  function headingCard(){
    const r=root();
    const nodes=Array.from(r.querySelectorAll('h1,h2,h3,h4,h5,.card-title,.panel-title,.section-title,strong,b'));
    const heading=nodes.find(function(n){return String(n.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()==='program progress'});
    if(!heading)return null;
    let node=heading;
    while(node&&node!==r&&node!==document.body){
      const cls=String(node.className||'');
      if(/card|panel/i.test(cls))return {card:node,heading:heading};
      node=node.parentElement;
    }
    return {card:heading.parentElement||null,heading:heading};
  }
  function programName(sp){
    try{
      if(typeof programById==='function'){
        const p=programById(sp.program_id);
        if(p)return p.program_name||p.name||p.title||'Program';
      }
    }catch(e){}
    return sp.program_name||sp.name||sp.title||'Program';
  }
  function currentPrograms(){
    if(typeof state==='undefined'||!Array.isArray(state.studentPrograms))return [];
    const sid=state.currentStudent&&state.currentStudent.id;
    return state.studentPrograms.filter(function(sp){return !sid||!sp.student_id||String(sp.student_id)===String(sid)})
      .map(function(sp){return {sp:sp,name:programName(sp)}})
      .sort(function(a,b){const ao=Number(a.sp.display_order||999),bo=Number(b.sp.display_order||999);return ao-bo||a.name.localeCompare(b.name)});
  }
  function sessionDate(s){return String((s&&(s.session_date||s.ended_at||s.created_at))||'').slice(0,10)}
  function behaviorCount(s){
    const bc=s&&s.behavior_counts&&typeof s.behavior_counts==='object'?s.behavior_counts:null;
    if(bc){
      const sum=Object.keys(bc).reduce(function(t,k){const n=Number(bc[k]);return t+(Number.isFinite(n)?n:0)},0);
      if(sum>0)return sum;
    }
    const total=Number(s&&s.total_behaviors);
    return Number.isFinite(total)?total:0;
  }
  function filteredSessions(selectedId){
    if(typeof state==='undefined'||!Array.isArray(state.sessions))return [];
    const sid=state.currentStudent&&state.currentStudent.id;
    return state.sessions.filter(function(s){
      if(sid&&s.student_id&&String(s.student_id)!==String(sid))return false;
      if(selectedId&&selectedId!=='all'&&String(s.student_compass_program_id||'')!==String(selectedId))return false;
      return !!sessionDate(s);
    });
  }
  function targetFor(selectedId,sessions,programs){
    const getTarget=function(sp){const n=Number(sp&&sp.goal_percentage);return Number.isFinite(n)&&n>=0&&n<=100?n:null};
    if(selectedId&&selectedId!=='all'){
      const item=programs.find(function(p){return String(p.sp.id)===String(selectedId)});
      return item?getTarget(item.sp):null;
    }
    const trialsByProgram={};
    sessions.forEach(function(s){const id=String(s.student_compass_program_id||'');const t=Number(s.trials_total||0);if(id&&Number.isFinite(t)&&t>0)trialsByProgram[id]=(trialsByProgram[id]||0)+t});
    let weighted=0,weight=0,plain=0,count=0;
    programs.forEach(function(item){
      const target=getTarget(item.sp);if(target==null)return;
      plain+=target;count+=1;
      const w=trialsByProgram[String(item.sp.id)]||0;
      if(w>0){weighted+=target*w;weight+=w}
    });
    if(weight>0)return Math.round((weighted/weight)*10)/10;
    if(count>0)return Math.round((plain/count)*10)/10;
    return null;
  }
  function fmtDate(v){
    const p=String(v||'').split('-');
    return p.length===3?(Number(p[1])+'/'+Number(p[2])+'/'+p[0]):String(v||'');
  }
  function niceBehaviorMax(v){
    const n=Math.max(0,Number(v)||0);
    if(n<=4)return 4;
    if(n<=8)return 8;
    if(n<=12)return 12;
    return Math.ceil(n/5)*5;
  }
  function buildDays(sessions){
    const byDay=new Map();
    sessions.forEach(function(s){
      const date=sessionDate(s);if(!date)return;
      const cur=byDay.get(date)||{date:date,trials:0,correct:0,behaviors:0,sessions:0};
      const trials=Number(s.trials_total||0),correct=Number(s.targets_correct||0);
      if(Number.isFinite(trials)&&trials>0)cur.trials+=trials;
      if(Number.isFinite(correct)&&correct>=0)cur.correct+=correct;
      cur.behaviors+=behaviorCount(s);
      cur.sessions+=1;
      byDay.set(date,cur);
    });
    return Array.from(byDay.values()).sort(function(a,b){return a.date.localeCompare(b.date)}).map(function(d){
      d.achieved=d.trials>0?Math.round((100*d.correct/d.trials)*100)/100:null;
      d.behaviorRate=Math.round(d.behaviors*100)/100;
      return d;
    });
  }
  function render(){
    const found=headingCard();if(!found||!found.card)return false;
    const card=found.card,heading=found.heading;
    const programs=currentPrograms();
    let select=card.querySelector('select[data-compass-progress-select="1"]')||card.querySelector('select');
    if(!select){
      select=document.createElement('select');
      const header=heading.parentElement||card;
      header.appendChild(select);
    }
    select.dataset.compassProgressSelect='1';
    select.style.minWidth='260px';
    select.style.maxWidth='430px';
    select.style.padding='10px 14px';
    select.style.border='1px solid #9dbdf7';
    select.style.borderRadius='10px';
    select.style.background='#fff';
    select.style.fontSize='15px';
    const prior=select.dataset.compassSelected||select.value||'all';
    const opts=['<option value="all">All Programs</option>'].concat(programs.map(function(item){return '<option value="'+escText(item.sp.id)+'">'+escText(item.name)+'</option>'}));
    select.innerHTML=opts.join('');
    select.value=programs.some(function(p){return String(p.sp.id)===String(prior)})?prior:'all';
    select.dataset.compassSelected=select.value;

    let host=card.querySelector('#compassProgressTrendHost');
    if(!host){host=document.createElement('div');host.id='compassProgressTrendHost';host.style.marginTop='18px';card.appendChild(host)}
    Array.from(card.querySelectorAll('svg,canvas')).forEach(function(v){
      if(v.closest('#compassProgressTrendHost'))return;
      const p=v.parentElement;
      if(p&&p!==card&&!p.contains(heading)&&!p.contains(select))p.style.setProperty('display','none','important');
      else v.style.setProperty('display','none','important');
    });

    const selectedId=select.value||'all';
    const sessions=filteredSessions(selectedId);
    const days=buildDays(sessions);
    const goal=targetFor(selectedId,sessions,programs);
    if(!days.length){
      host.innerHTML='<div style="padding:34px;text-align:center;color:#637b98;border-top:1px solid #e5e7eb">No dated program-session data is available for this selection yet.</div>';
      return true;
    }

    const blue='#4285F4',red='#EA4335',yellow='#F4B400',grid='#d2d7de',ink='#202124',muted='#757575';
    const maxBehavior=Math.max.apply(null,days.map(function(d){return d.behaviorRate}).concat([0]));
    const rightMax=niceBehaviorMax(maxBehavior);
    const left=88,right=64,top=68,plotBottom=410,plotH=285,bottom=110,step=82;
    const width=Math.max(1280,left+right+Math.max(2,days.length)*step),height=plotBottom+bottom,plotW=width-left-right;
    const x=function(i){return days.length===1?left+plotW/2:left+(plotW*i/(days.length-1))};
    const yPct=function(v){return plotBottom-plotH*(Math.max(0,Math.min(100,Number(v)||0))/100)};
    const yBeh=function(v){return plotBottom-plotH*(Math.max(0,Math.min(rightMax,Number(v)||0))/rightMax)};
    const leftTicks=[0,25,50,75,100].map(function(v){const y=yPct(v);return '<line x1="'+left+'" y1="'+y+'" x2="'+(width-right)+'" y2="'+y+'" stroke="'+grid+'"/><text x="'+(left-12)+'" y="'+(y+5)+'" text-anchor="end" fill="'+ink+'" font-size="14">'+v.toFixed(2)+'%</text>'}).join('');
    const rightTicks=[0,1,2,3,4].map(function(i){const v=rightMax*i/4,y=yBeh(v),txt=(Math.round(v*100)/100);return '<text x="'+(width-right+12)+'" y="'+(y+5)+'" fill="'+ink+'" font-size="14">'+txt+'</text>'}).join('');
    const achieved=days.map(function(d,i){return d.achieved==null?null:{x:x(i),y:yPct(d.achieved),v:d.achieved,date:d.date}}).filter(Boolean);
    const achievedPath=achieved.length>1?'<polyline points="'+achieved.map(function(p){return p.x+','+p.y}).join(' ')+'" fill="none" stroke="'+blue+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>':'';
    const achievedDots=achieved.map(function(p){return '<g><circle cx="'+p.x+'" cy="'+p.y+'" r="3.5" fill="'+blue+'"/><text x="'+p.x+'" y="'+(p.y-14)+'" text-anchor="middle" fill="'+blue+'" font-size="13" font-weight="700">'+p.v.toFixed(2)+'%</text></g>'}).join('');
    const behavior=days.map(function(d,i){return {x:x(i),y:yBeh(d.behaviorRate),v:d.behaviorRate,date:d.date}});
    const behaviorPath=behavior.length>1?'<polyline points="'+behavior.map(function(p){return p.x+','+p.y}).join(' ')+'" fill="none" stroke="'+yellow+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>':'';
    const behaviorDots=behavior.map(function(p){return '<g><circle cx="'+p.x+'" cy="'+p.y+'" r="3.5" fill="'+yellow+'"/><text x="'+p.x+'" y="'+(p.y+25)+'" text-anchor="middle" fill="'+yellow+'" font-size="13" font-weight="700">'+(Math.round(p.v*100)/100)+'</text></g>'}).join('');
    const goalLine=goal==null?'':('<line x1="'+x(0)+'" y1="'+yPct(goal)+'" x2="'+x(days.length-1)+'" y2="'+yPct(goal)+'" stroke="'+red+'" stroke-width="3"/>');
    const dates=days.map(function(d,i){const xx=x(i),yy=plotBottom+34;return '<text x="'+xx+'" y="'+yy+'" text-anchor="end" fill="'+ink+'" font-size="12.5" transform="rotate(-45 '+xx+' '+yy+')">'+escText(fmtDate(d.date))+'</text>'}).join('');
    const legend='<div style="display:flex;justify-content:center;gap:28px;align-items:center;flex-wrap:wrap;margin:2px 0 8px;font-size:13px;color:'+ink+'"><span style="display:inline-flex;align-items:center;gap:7px"><i style="display:inline-block;width:18px;height:4px;background:'+blue+'"></i>Achieved</span><span style="display:inline-flex;align-items:center;gap:7px"><i style="display:inline-block;width:18px;height:4px;background:'+red+'"></i>Goal</span><span style="display:inline-flex;align-items:center;gap:7px"><i style="display:inline-block;width:18px;height:4px;background:'+yellow+'"></i>Behavior Rate</span></div>';
    host.innerHTML='<div style="font-size:25px;font-weight:400;color:'+muted+';margin:8px 0 8px">Achieved and Goal</div>'+legend+'<div style="width:100%;overflow-x:auto;overflow-y:hidden;padding-bottom:8px"><svg viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+'" role="img" aria-label="Program progress showing achieved, goal and behavior rate by date">'+leftTicks+rightTicks+'<line x1="'+left+'" y1="'+plotBottom+'" x2="'+(width-right)+'" y2="'+plotBottom+'" stroke="#555"/>'+goalLine+achievedPath+achievedDots+behaviorPath+behaviorDots+dates+'</svg></div>';
    return true;
  }
  function bind(){
    const r=root();
    const progressTab=Array.from(r.querySelectorAll('button,[role="tab"]')).find(function(b){return String(b.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()==='progress'});
    if(progressTab&&!progressTab.dataset.compassProgressTrendBound){
      progressTab.dataset.compassProgressTrendBound='1';
      progressTab.addEventListener('click',function(){setTimeout(render,80);setTimeout(render,250)});
    }
    const found=headingCard();
    if(found&&found.card){
      const select=found.card.querySelector('select');
      if(select&&!select.dataset.compassProgressChangeBound){
        select.dataset.compassProgressChangeBound='1';
        select.addEventListener('change',function(){this.dataset.compassSelected=this.value;setTimeout(render,0)});
      }
    }
  }
  let timer=null;
  const observer=new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(function(){bind();const found=headingCard();if(found&&found.card&&found.card.offsetParent!==null)render()},80)});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(function(){bind();render()},300);
})();
