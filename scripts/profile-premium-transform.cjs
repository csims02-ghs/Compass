module.exports = function premiumStudentProfile(source){
  const begin=source.indexOf('      <section id="page-student-profile" class="page">');
  const end=source.indexOf('        <div class="content profile-content">',begin);
  if(begin<0||end<begin)throw Error("COMPASS premium profile section anchors changed");
  const svg=(paths)=>'<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
  const ico={
    overview:svg('<path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/>'),
    iepservices:svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>'),
    programs:svg('<path d="M9 6h12M9 12h12M9 18h12"/><path d="m3.5 6 .7.7 1.3-1.5M3.5 12l.7.7 1.3-1.5M3.5 18l.7.7 1.3-1.5"/>'),
    goals:svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="m12 12 7-7"/>'),
    assessments:svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6"/>'),
    behavior:svg('<path d="m12 3 10 18H2z"/><path d="M12 9v5M12 18h.01"/>'),
    notes:svg('<path d="M4 4h16v13H7l-3 3z"/><path d="M8 9h8M8 13h5"/>'),
    team:svg('<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/>'),
    progress:svg('<path d="M4 20V4M4 20h17M8 15l4-5 4 3 5-7"/>'),
    history:svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 3"/>'),
    calendar:svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 18h3"/>'),
    school:svg('<path d="M4 21V9l8-5 8 5v12M9 21v-6h6v6M2 21h20M8 10h1M15 10h1"/>'),
    grade:svg('<path d="m2 9 10-5 10 5-10 5zM6 12v5c4 3 8 3 12 0v-5M22 9v7"/>'),
    classroom:svg('<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4M8 8h8M8 12h5"/>'),
    info:svg('<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>'),
    bell:svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M10 21h4"/>')
  };
  const tab=(name,label,icon,active=false)=>'<button type="button" data-tab="'+name+'" class="'+(active?'active':'')+'" aria-label="'+label+'">'+icon+'<span>'+label+'</span></button>';
  const tabs=tab('overview','Overview',ico.overview,true)+tab('iepservices','IEP Services',ico.iepservices)+tab('programs','Programs',ico.programs)+
    '<button id="compassGraphsChartsTab" type="button" data-compass-graphs-tab="1" aria-label="Graphs">'+ico.progress+'<span>Graphs</span></button>'+
    tab('notes','Notes & Documents',ico.notes)+tab('goals','Goals',ico.goals)+tab('assessments','Assessments',ico.assessments)+tab('behavior','Behavior',ico.behavior)+tab('team','Team',ico.team)+tab('history','History',ico.history);
  const markup=`      <section id="page-student-profile" class="page">
        <div class="profile-top compass-premium-top">
          <div class="panel-head compass-premium-toolbar"><div class="breadcrumb">Students <span>›</span> Student Profile</div><button id="printProfileBtn" class="btn" type="button">Print Profile</button></div>
          <div class="compass-premium-grid">
            <div class="compass-premium-left">
              <div class="compass-premium-identity">
                <div class="compass-premium-hero">
                  <div id="profileAvatar" class="avatar">—</div>
                  <div class="compass-premium-person"><h1 id="profileName">Student</h1><div id="profileMeta" class="profile-meta"></div><span id="profileStatus" class="status-pill">Active</span></div>
                  <button id="editStudentBtn" class="btn compass-premium-edit" type="button">✎ &nbsp; Edit Student</button>
                </div>
                <nav id="profileTabs" class="tabs compass-premium-tabs" aria-label="Student profile sections">${tabs}</nav>
              </div>
              <article class="card compass-premium-attention">
                <div class="compass-premium-attention-head"><h2><span class="compass-premium-bell">${ico.bell}</span>Needs Attention</h2><button id="profileViewAllBtn" type="button" class="compass-premium-view-all">View All →</button></div>
                <div id="profileAlerts" class="profile-alert-empty" aria-live="polite"></div>
              </article>
            </div>
            <aside class="card compass-premium-information">
              <h2 class="compass-premium-info-title"><span class="compass-premium-info-mark">${ico.info}</span>Key Information</h2>
              <div id="quickInfo" class="quick-list"></div>
              <div class="compass-premium-next-wrap">
                <button id="profileNextEvent" class="compass-premium-next" type="button" disabled><span class="compass-premium-next-icon">${ico.calendar}</span><span><small>Next Scheduled Event</small><strong>No upcoming event scheduled</strong></span><span class="compass-premium-next-arrow">›</span></button>
              </div>
            </aside>
          </div>
        </div>
`;
  source=source.slice(0,begin)+markup+source.slice(end);
  const previousGraphOrder="const order=['Overview','IEP & Services','Programs','Goals','Behavior','Graphs and Charts','Progress','Assessments','Observation & Session Notes','Documents','Team','History'];";
  if(!source.includes(previousGraphOrder))throw Error('COMPASS existing Graphs tab ordering has changed');
  source=source.replace(previousGraphOrder,"const order=['Overview','IEP Services','Programs','Graphs','Notes & Documents','Goals','Assessments','Behavior','Team','History'];");
  const graphProgressNeedle="    if(!tab.dataset.compassBound){tab.dataset.compassBound='1';";
  const graphProgressCode="    // Keep the existing native Program Progress view reachable from the Graphs section.\n    if(pane&&!pane.querySelector('#compassGraphsProgressButton')){\n      const progressLink=document.createElement('button');\n      progressLink.id='compassGraphsProgressButton';\n      progressLink.type='button';\n      progressLink.className='btn small';\n      progressLink.textContent='Program Progress';\n      progressLink.addEventListener('click',function(){\n        leaveGraphs();\n        showProfileTab('progress');\n        tab.classList.add('active');\n        tab.setAttribute('aria-selected','true');\n      });\n      const chartHeader=pane.querySelector('.compass-program-chart-card > div');\n      if(chartHeader)chartHeader.appendChild(progressLink);else pane.prepend(progressLink);\n    }\n";
  if(!source.includes(graphProgressNeedle))throw Error('COMPASS Graphs binding has changed');
  source=source.replace(graphProgressNeedle,graphProgressCode+graphProgressNeedle);
  const alertsStart=source.indexOf('  function renderProfileAlerts(){');
  const alertsEnd=source.indexOf('  function openStudentNoteReview(',alertsStart);
  if(alertsStart<0||alertsEnd<alertsStart)throw Error("Profile calendar alert renderer anchor changed");
  const alertFn=`  function renderProfileAlerts(){
    const el=$('profileAlerts'),st=state.currentStudent;if(!el||!st)return;
    const today=todayISO();
    const dayIndex=(d)=>{const p=String(d).split('-').map(Number);return Date.UTC(p[0],p[1]-1,p[2])/86400000};
    const todayIndex=dayIndex(today);
    const upcoming=(state.events||[]).filter(e=>e.student_id===st.id&&e.start_at&&localISO(e.end_at||e.start_at)>=today).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
    const next=upcoming[0],nextEl=$('profileNextEvent');
    if(nextEl){
      nextEl.disabled=!next;
      if(next){
        const days=Math.max(0,Math.round(dayIndex(localISO(next.start_at))-todayIndex));
        nextEl.dataset.eventId=next.id;
        nextEl.innerHTML='<span class="compass-premium-next-icon" aria-hidden="true">▦</span><span><small>Next Scheduled Event</small><strong>'+esc(next.title||'Scheduled event')+'</strong><em>'+esc(fmtDate(next.start_at))+' ('+days+' day'+(days===1?'':'s')+')</em></span><span class="compass-premium-next-arrow">›</span>';
      }else{
        delete nextEl.dataset.eventId;
        nextEl.innerHTML='<span class="compass-premium-next-icon" aria-hidden="true">▦</span><span><small>Next Scheduled Event</small><strong>No upcoming event scheduled</strong></span>';
      }
    }
    const cal=upcoming.map(e=>({...e,days:Math.round(dayIndex(localISO(e.start_at))-todayIndex)})).filter(e=>e.days<=30);
    const notes=(state.notes||[]).filter(n=>n.student_id===st.id&&n.note_type==='session'&&!(state.noteAlertReads||[]).includes(n.id));
    const tasks=(state.tasks||[]).filter(t=>t.student_id===st.id&&['open','in_progress'].includes(t.status));
    const a=cal.map(e=>'<button type="button" class="profile-alert-row compass-premium-calendar-alert" data-event-id="'+esc(e.id)+'"><span class="profile-alert-sym" aria-hidden="true">▦</span><span class="profile-alert-text"><strong>'+esc(e.title||'Scheduled event')+'</strong><small>Due in '+e.days+' days · '+esc(fmtDate(e.start_at))+'</small></span><span class="compass-premium-days '+(e.days<=7?'urgent':'')+'">'+e.days+' Days</span></button>').join('');
    const b=notes.map(n=>'<button type="button" class="profile-alert-row profile-alert-note" data-review-student-note="'+esc(n.id)+'"><span class="profile-alert-sym" aria-hidden="true">✎</span><span class="profile-alert-text"><strong>'+esc(n.title||'Session note needs review')+'</strong><small>Session note · '+esc(fmtDate(n.note_date))+' · Review</small></span></button>').join('');
    const c=tasks.map(t=>'<button type="button" class="profile-alert-row profile-alert-task" data-complete-task="'+esc(t.id)+'" title="Mark action completed"><span class="profile-alert-sym" aria-hidden="true">☑</span><span class="profile-alert-text"><strong>'+esc(t.title)+'</strong><small>Action item · '+(t.due_at?'Due '+esc(fmtDate(t.due_at)):'No due date')+' · Complete</small></span></button>').join('');
    el.className=a+b+c?'profile-alert-items':'profile-alert-empty';
    el.innerHTML=a+b+c||'<span>✓ No calendar dates within 30 days or session notes requiring review.</span>';
  }
`;
  source=source.slice(0,alertsStart)+alertFn+source.slice(alertsEnd);
  const oldLines="    const lines=[['🎓','Grade',st.grade_level||'—'],['🏫','School',r.school?.name||'—'],['▣','Classroom',r.classroom?.name||'—'],['▦','Enrollment',fmtDate(st.enrollment_date)]];";
  const oldHtml="    $('quickInfo').innerHTML=lines.map(x=>'<div class=\"quick-line\"><span class=\"profile-info-icon\" aria-hidden=\"true\">'+x[0]+'</span><span class=\"profile-info-data\"><small>'+esc(x[1])+'</small><strong>'+esc(x[2])+'</strong></span></div>').join('');";
  if(!source.includes(oldLines)||!source.includes(oldHtml))throw Error("Key Information renderer anchor changed");
  source=source.replace(oldLines,"    const lines=[['grade','Grade',st.grade_level||'—'],['school','School',r.school?.name||'—'],['classroom','Classroom',r.classroom?.name||'—'],['enrollment','Enrollment Date',fmtDate(st.enrollment_date)]];");
  source=source.replace(oldHtml,"    $('quickInfo').innerHTML=lines.map(x=>'<div class=\"quick-line quick-line-'+x[0]+'\"><span class=\"profile-info-icon\" aria-hidden=\"true\">'+({grade:'🎓',school:'🏫',classroom:'▣',enrollment:'▦'}[x[0]])+'</span><span class=\"profile-info-data\"><small>'+esc(x[1])+'</small><strong>'+esc(x[2])+'</strong></span></div>').join('');");
  const nav="  function showProfileTab(name){if(name==='behavior'){openBehaviorSelection();return}";
  if(!source.includes(nav))throw Error("Student profile tab router anchor changed");
  source=source.replace(nav,"  function showProfileTab(name){if(name==='docs')name='notes';if(name==='behavior'){openBehaviorSelection();return}");
  const css=`
<style id="compass-premium-profile-v1">
#page-student-profile{background:#f3f8ff}
#page-student-profile .compass-premium-top{padding:20px 22px 15px;max-width:1850px;margin:0 auto}
#page-student-profile .compass-premium-toolbar{margin-bottom:12px}
#page-student-profile .compass-premium-grid{display:grid;grid-template-columns:minmax(0,1.66fr) minmax(350px,1fr);gap:22px;align-items:stretch}
#page-student-profile .compass-premium-left{min-width:0;display:flex;flex-direction:column;gap:17px}
#page-student-profile .compass-premium-identity{overflow:visible;background:#fff;border-radius:20px;box-shadow:0 9px 30px rgba(14,52,92,.065)}
#page-student-profile .compass-premium-hero{position:relative;display:flex;align-items:center;gap:28px;min-height:215px;padding:29px 34px;background:linear-gradient(127deg,#112e55 0%,#194578 49%,#2875d6 100%);border-radius:20px 20px 0 0;color:#fff;overflow:hidden}
#page-student-profile .compass-premium-hero:after{content:"";position:absolute;width:65%;height:190%;right:-14%;bottom:-130%;border-radius:45% 0 0 0;background:rgba(80,154,255,.15);transform:rotate(-25deg);pointer-events:none}
#page-student-profile .compass-premium-hero .avatar{width:137px;height:137px;min-width:137px;font-size:50px;background:#deebfc;color:#0f315e;border:6px solid #fff;box-shadow:0 0 0 2px #dce9f8;z-index:1}
#page-student-profile .compass-premium-person{min-width:0;z-index:1;align-self:center;flex:1}
#page-student-profile .compass-premium-person h1{margin:0;font-size:clamp(26px,2.5vw,41px);line-height:1.09;font-weight:860;color:#fff;overflow-wrap:anywhere;letter-spacing:-.035em}
#page-student-profile .compass-premium-person .profile-meta{font-size:clamp(16px,1.45vw,22px);margin:12px 0 15px;color:#e1ebfb}
#page-student-profile .compass-premium-person .status-pill{display:inline-flex;align-items:center;gap:9px;font-size:17px;padding:8px 19px;background:#0d9e69;color:#fff}
#page-student-profile .compass-premium-person .status-pill:before{content:"";background:#fff;width:10px;height:10px;border-radius:50%}
#page-student-profile .compass-premium-edit{position:absolute;right:24px;top:24px;z-index:2;border:1px solid #a7cdfa;color:#fff;background:rgba(4,31,71,.34);border-radius:12px;font-size:16px;font-weight:750;padding:11px 18px}
#page-student-profile .compass-premium-edit:hover{background:rgba(255,255,255,.17)}
#page-student-profile .compass-premium-tabs{position:relative;display:flex;justify-content:space-between;align-items:stretch;gap:3px;z-index:3;top:auto;padding:0 12px;overflow:visible;flex-wrap:nowrap;border:0;border-radius:0 0 20px 20px;background:#fff;min-height:88px}
#page-student-profile .compass-premium-tabs>button{flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;min-width:0;white-space:normal;padding:13px 5px 10px;font-size:clamp(10px,.9vw,14px);font-weight:650;border-radius:13px 13px 0 0;border:0;border-bottom:3px solid transparent;background:transparent;line-height:1.1;text-align:center;color:#30445f}
#page-student-profile .compass-premium-tabs>button svg{width:23px;height:23px}
#page-student-profile .compass-premium-tabs>button.active{background:#edf5ff;color:#126bfa;border-bottom-color:#156ef4}
#page-student-profile .compass-premium-tabs>button:hover:not(.active){background:#f3f7fc}
#page-student-profile .compass-premium-more{position:relative;align-self:stretch;display:flex;align-items:stretch}
#page-student-profile .compass-premium-more summary{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-width:56px;height:100%;padding:10px 4px;cursor:pointer;list-style:none;color:#344b6a;font-size:19px}
#page-student-profile .compass-premium-more summary span{font-size:12px}
#page-student-profile .compass-premium-more-menu{position:absolute;right:0;top:100%;z-index:50;min-width:180px;background:#fff;padding:8px;border:1px solid #dde8f4;border-radius:12px;box-shadow:0 14px 25px #112b4f20}
#page-student-profile .compass-premium-more:not([open]) .compass-premium-more-menu{display:none}
#page-student-profile .compass-premium-more-menu button{width:100%;display:flex;gap:8px;align-items:center;background:#fff;border:0;padding:11px;text-align:left;border-radius:9px;color:#163960;font-size:14px}
#page-student-profile .compass-premium-more-menu button:hover,#page-student-profile .compass-premium-more-menu button.active{background:#eaf3ff;color:#076bf5}
#page-student-profile .compass-premium-attention,#page-student-profile .compass-premium-information{border-radius:20px;box-shadow:0 9px 30px rgba(14,52,92,.065);background:#fff;border:0}
#page-student-profile .compass-premium-attention{padding:21px 24px;min-height:200px}
#page-student-profile .compass-premium-attention-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:12px}
#page-student-profile .compass-premium-attention-head h2{display:flex;align-items:center;gap:12px;font-size:24px;margin:0;color:#0f2c58}
#page-student-profile .compass-premium-bell{display:grid;place-items:center;background:#ffebed;color:#e93b55;width:44px;height:44px;border-radius:50%}
#page-student-profile .compass-premium-view-all{border:0;background:transparent;color:#0066ec;font-weight:750;font-size:16px;white-space:nowrap}
#page-student-profile #profileAlerts.profile-alert-items{max-height:unset;padding-right:0;gap:8px}
#page-student-profile #profileAlerts.profile-alert-empty{min-height:85px}
#page-student-profile .profile-alert-row{min-height:68px;display:flex;align-items:center;border:0;border-radius:14px;background:#f2f6fc;padding:12px 16px;color:#0e3159}
#page-student-profile .profile-alert-row .profile-alert-sym{flex:none;display:grid;place-items:center;width:47px;height:47px;border-radius:11px;background:#ffe9e9;color:#ec3447;font-size:23px}
#page-student-profile .profile-alert-row .profile-alert-text{flex:1}
#page-student-profile .profile-alert-row .profile-alert-text strong{font-size:16px}
#page-student-profile .profile-alert-row .profile-alert-text small{font-size:13px;color:#5c7291}
#page-student-profile .compass-premium-days{white-space:nowrap;border-radius:30px;padding:7px 12px;color:#cc7500;background:#fff1d6;font-weight:850;font-size:15px}
#page-student-profile .compass-premium-days.urgent{background:#ffe0e3;color:#d4293c}
#page-student-profile .compass-premium-information{padding:23px 25px;display:flex;flex-direction:column;min-width:0}
#page-student-profile .compass-premium-info-title{margin:0 0 17px;display:flex;gap:13px;align-items:center;color:#102f5b;font-size:clamp(23px,2vw,31px);font-weight:850;letter-spacing:-.03em}
#page-student-profile .compass-premium-info-mark{display:grid;place-items:center;color:#fff;background:#123b73;width:37px;height:37px;border-radius:50%}
#page-student-profile .compass-premium-info-mark svg{width:23px;height:23px}
#page-student-profile #quickInfo{margin-top:0;gap:0;flex:1}
#page-student-profile #quickInfo .quick-line{display:grid;grid-template-columns:65px minmax(0,1fr);align-items:center;gap:17px;padding:19px 0;border-bottom:1px solid #e1e9f5}
#page-student-profile .profile-info-icon{min-height:61px;width:61px;font-size:28px;border-radius:14px;color:#126ae5;background:#eaf3ff}
#page-student-profile .quick-line-school .profile-info-icon{background:#fff5e5;color:#e59000}
#page-student-profile .quick-line-classroom .profile-info-icon{background:#e3f8ed;color:#08a05c}
#page-student-profile .quick-line-enrollment .profile-info-icon{background:#f0ebff;color:#6845db}
#page-student-profile .profile-info-data small{font-size:15px;color:#526b8d}
#page-student-profile .profile-info-data strong{font-size:18px;color:#102f5b;line-height:1.35}
#page-student-profile .compass-premium-next-wrap{padding-top:18px}
#page-student-profile .compass-premium-next{display:grid;grid-template-columns:58px minmax(0,1fr) 20px;gap:11px;align-items:center;text-align:left;border:0;border-radius:14px;background:#edf5ff;width:100%;padding:16px 14px;color:#0e3159;min-height:108px}
#page-student-profile .compass-premium-next:disabled{cursor:default;opacity:.8}
#page-student-profile .compass-premium-next-icon{width:55px;height:55px;display:grid;place-items:center;background:#dcecff;color:#0765d9;border-radius:12px;font-size:29px}
#page-student-profile .compass-premium-next small{display:block;color:#526e91;font-size:15px;margin-bottom:5px}
#page-student-profile .compass-premium-next strong{display:block;font-size:18px}
#page-student-profile .compass-premium-next em{display:block;font-style:normal;color:#516d92;font-size:15px;margin-top:5px}
#page-student-profile .compass-premium-next-arrow{font-size:31px;color:#216ed0}
#page-student-profile #profile-tab-notes.profile-tab.active{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:19px;align-items:start}
#page-student-profile #profile-tab-notes .card.panel,#page-student-profile #profile-documents-section .card.panel{height:100%}
#page-student-profile #profile-documents-section .two-col{display:grid;grid-template-columns:1fr;gap:12px}
#page-student-profile #profile-documents-section .two-col .card.panel:first-child{order:2}
#page-student-profile #profile-documents-section .two-col .card.panel:last-child{order:1}
@media(max-width:1350px){#page-student-profile .compass-premium-grid{grid-template-columns:minmax(0,1fr) minmax(325px,.8fr);gap:15px}#page-student-profile .compass-premium-hero{padding:25px 22px;gap:16px}#page-student-profile .compass-premium-hero .avatar{width:98px;height:98px;min-width:98px;font-size:35px}#page-student-profile .compass-premium-edit{font-size:13px;padding:8px 11px}#page-student-profile .compass-premium-tabs{padding:0 5px}#page-student-profile .compass-premium-tabs>button{font-size:10.5px}}
@media(max-width:1090px){#page-student-profile .compass-premium-grid{grid-template-columns:1fr}#page-student-profile .compass-premium-information{order:2}#page-student-profile .compass-premium-hero{min-height:186px}#page-student-profile .compass-premium-tabs>button{font-size:12px}}
@media(max-width:680px){#page-student-profile .compass-premium-top{padding:12px}#page-student-profile .compass-premium-hero{display:flex;align-items:center;flex-wrap:wrap;padding:22px 15px;gap:13px}#page-student-profile .compass-premium-edit{position:static;margin-left:auto}#page-student-profile .compass-premium-tabs{overflow-x:auto;justify-content:flex-start;scrollbar-width:thin}#page-student-profile .compass-premium-tabs>button{min-width:95px;font-size:11px}#page-student-profile .compass-premium-more{position:sticky;right:0;background:#fff}#page-student-profile .compass-premium-person h1{font-size:24px}#page-student-profile .compass-premium-person .profile-meta{font-size:14px}#page-student-profile .compass-premium-information{padding:18px}#page-student-profile #profile-tab-notes.profile-tab.active{grid-template-columns:1fr}#page-student-profile .compass-premium-attention{padding:16px}#page-student-profile .compass-premium-attention-head h2{font-size:20px}}

/* COMPASS compact student profile • desktop/laptop/tablet: visually consistent with approved premium header */
#page-student-profile .compass-premium-top{padding:12px 14px 10px;max-width:none}
#page-student-profile .compass-premium-toolbar{margin-bottom:8px}
#page-student-profile .compass-premium-grid{grid-template-columns:minmax(0,1.72fr) minmax(305px,.95fr);gap:13px}
#page-student-profile .compass-premium-left{gap:11px}
#page-student-profile .compass-premium-identity,
#page-student-profile .compass-premium-attention,
#page-student-profile .compass-premium-information{border-radius:16px}
#page-student-profile .compass-premium-hero{min-height:151px;padding:20px 22px;gap:18px;border-radius:16px 16px 0 0}
#page-student-profile .compass-premium-hero .avatar{width:96px;height:96px;min-width:96px;font-size:36px;border-width:4px}
#page-student-profile .compass-premium-person{padding-right:105px}
#page-student-profile .compass-premium-person h1{font-size:clamp(22px,2vw,31px);line-height:1.1}
#page-student-profile .compass-premium-person .profile-meta{font-size:14px;margin:8px 0 10px}
#page-student-profile .compass-premium-person .status-pill{font-size:12px;padding:5px 12px;gap:7px}
#page-student-profile .compass-premium-person .status-pill:before{width:8px;height:8px}
#page-student-profile .compass-premium-edit{right:17px;top:16px;font-size:12px;padding:8px 11px;border-radius:9px}
#page-student-profile .compass-premium-tabs{min-height:66px;gap:1px;padding:0 7px;border-radius:0 0 16px 16px}
#page-student-profile .compass-premium-tabs>button{gap:4px;font-size:11px;padding:9px 3px 7px;line-height:1.15;border-bottom-width:2px}
#page-student-profile .compass-premium-tabs>button svg{width:18px;height:18px;flex:none}
#page-student-profile .compass-premium-more summary{min-width:40px;font-size:16px;gap:1px;padding:7px 2px}
#page-student-profile .compass-premium-more summary span{font-size:11px}
#page-student-profile .compass-premium-attention{min-height:0;padding:14px 16px}
#page-student-profile .compass-premium-attention-head{margin-bottom:8px}
#page-student-profile .compass-premium-attention-head h2{font-size:18px;gap:9px}
#page-student-profile .compass-premium-bell{width:33px;height:33px}
#page-student-profile .compass-premium-bell svg{width:18px;height:18px}
#page-student-profile .compass-premium-view-all{font-size:12px}
#page-student-profile #profileAlerts.profile-alert-items{gap:6px}
#page-student-profile #profileAlerts.profile-alert-empty{min-height:60px;padding:12px;font-size:12px}
#page-student-profile .profile-alert-row{min-height:52px;padding:8px 11px;gap:9px;border-radius:10px}
#page-student-profile .profile-alert-row .profile-alert-sym{width:34px;height:34px;font-size:19px;border-radius:9px}
#page-student-profile .profile-alert-row .profile-alert-text strong{font-size:13px;line-height:1.25}
#page-student-profile .profile-alert-row .profile-alert-text small{font-size:11px;margin-top:2px;line-height:1.25}
#page-student-profile .compass-premium-days{padding:5px 8px;font-size:11px}
#page-student-profile .compass-premium-information{padding:17px 18px}
#page-student-profile .compass-premium-info-title{font-size:21px;gap:9px;margin-bottom:7px}
#page-student-profile .compass-premium-info-mark{width:28px;height:28px}
#page-student-profile .compass-premium-info-mark svg{width:17px;height:17px}
#page-student-profile #quickInfo .quick-line{grid-template-columns:45px minmax(0,1fr);gap:11px;padding:10px 0}
#page-student-profile .profile-info-icon{width:44px;min-height:44px;font-size:22px;border-radius:10px}
#page-student-profile .profile-info-data small{font-size:12px;margin-bottom:1px}
#page-student-profile .profile-info-data strong{font-size:15px;line-height:1.3}
#page-student-profile .compass-premium-next-wrap{padding-top:11px}
#page-student-profile .compass-premium-next{grid-template-columns:40px minmax(0,1fr) 14px;min-height:70px;gap:10px;padding:10px 12px;border-radius:11px}
#page-student-profile .compass-premium-next-icon{width:40px;height:40px;font-size:21px}
#page-student-profile .compass-premium-next small{font-size:12px;margin-bottom:3px}
#page-student-profile .compass-premium-next strong{font-size:14px;line-height:1.25}
#page-student-profile .compass-premium-next em{font-size:12px;margin-top:3px}
#page-student-profile .compass-premium-next-arrow{font-size:22px}
#page-student-profile .profile-content{padding-top:12px}
@media (min-width:1180px) and (max-width:1440px){
  #page-student-profile .compass-premium-grid{grid-template-columns:minmax(0,1.65fr) minmax(305px,.88fr);gap:12px}
  #page-student-profile .compass-premium-hero{padding:16px 18px;min-height:139px;gap:13px}
  #page-student-profile .compass-premium-hero .avatar{width:82px;height:82px;min-width:82px;font-size:31px}
  #page-student-profile .compass-premium-person{padding-right:95px}
  #page-student-profile .compass-premium-person h1{font-size:clamp(21px,1.75vw,26px)}
  #page-student-profile .compass-premium-tabs>button{font-size:10px;padding-left:2px;padding-right:2px}
}
@media (max-width:1179px){
  #page-student-profile .compass-premium-grid{grid-template-columns:minmax(0,1fr)}
  #page-student-profile .compass-premium-information{order:2}
  #page-student-profile .compass-premium-hero{min-height:133px}
  #page-student-profile .compass-premium-tabs>button{font-size:11px}
  #page-student-profile .compass-premium-information{padding:15px}
  #page-student-profile #quickInfo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px}
  #page-student-profile .compass-premium-next-wrap{padding-top:12px}
}
@media (max-width:680px){
  #page-student-profile .compass-premium-top{padding:9px}
  #page-student-profile .compass-premium-hero{min-height:0;padding:14px 12px;gap:10px}
  #page-student-profile .compass-premium-hero .avatar{width:64px;height:64px;min-width:64px;font-size:25px;border-width:3px}
  #page-student-profile .compass-premium-person{padding-right:0}
  #page-student-profile .compass-premium-person h1{font-size:20px}
  #page-student-profile .compass-premium-person .profile-meta{font-size:12px;margin:5px 0}
  #page-student-profile .compass-premium-edit{position:static;margin-left:auto}
  #page-student-profile .compass-premium-tabs{overflow-x:auto;min-height:60px}
  #page-student-profile .compass-premium-tabs>button{min-width:74px;font-size:10px;padding:7px 3px}
  #page-student-profile .compass-premium-tabs>button svg{width:18px;height:18px}
  #page-student-profile #quickInfo{grid-template-columns:1fr}
  #page-student-profile .compass-premium-attention{padding:11px}
  #page-student-profile .compass-premium-attention-head h2{font-size:17px}
  #page-student-profile .compass-premium-information{padding:13px}
  #page-student-profile #profile-tab-notes.profile-tab.active{grid-template-columns:1fr}
}

/* Ten visible destinations: two even rows, priority destinations first. */
#page-student-profile #profileTabs.compass-premium-tabs,
#page-student-profile #profileTabs.compass-premium-tabs.compass-profile-tabs-v7{
  display:grid!important;
  grid-template-columns:repeat(5,minmax(0,1fr))!important;
  grid-template-rows:repeat(2,minmax(54px,auto))!important;
  grid-auto-flow:row!important;
  align-items:stretch!important;
  width:100%!important;
  min-height:0!important;
  gap:0!important;
  padding:4px 7px 5px!important;
  overflow:visible!important;
}
#page-student-profile #profileTabs.compass-premium-tabs>button,
#page-student-profile #profileTabs.compass-premium-tabs.compass-profile-tabs-v7>button{
  width:100%!important;
  max-width:none!important;
  min-width:0!important;
  min-height:54px!important;
  margin:0!important;
  padding:7px 5px 6px!important;
  border-radius:9px!important;
  border-bottom:2px solid transparent!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
  gap:4px!important;
  font-size:11px!important;
  line-height:1.12!important;
  white-space:normal!important;
  text-align:center!important;
}
#page-student-profile #profileTabs.compass-premium-tabs>button.active,
#page-student-profile #profileTabs.compass-premium-tabs.compass-profile-tabs-v7>button.active{
  border-bottom-color:#176cf1!important;
}
#page-student-profile #profileTabs.compass-premium-tabs>button svg{width:18px!important;height:18px!important;flex-shrink:0}
#page-student-profile #profileTabs.compass-premium-tabs>button span{overflow-wrap:normal!important;hyphens:none!important}
@media(max-width:680px){
  #page-student-profile #profileTabs.compass-premium-tabs,
  #page-student-profile #profileTabs.compass-premium-tabs.compass-profile-tabs-v7{
    grid-template-columns:repeat(5,minmax(0,1fr))!important;
    overflow:visible!important;
    gap:0!important;
    padding:3px 2px!important;
  }
  #page-student-profile #profileTabs.compass-premium-tabs>button{min-width:0!important;min-height:49px!important;padding:5px 2px!important;font-size:9px!important}
  #page-student-profile #profileTabs.compass-premium-tabs>button svg{width:16px!important;height:16px!important}
}
</style>
`;
  if(!source.includes('</head>'))throw Error("Head closing tag missing");
  source=source.replace('</head>',css+'\n</head>');
  const bootstrap=`<script id="compass-premium-profile-bootstrap">
document.addEventListener('DOMContentLoaded',function(){
  const notes=document.getElementById('profile-tab-notes');
  const docs=document.getElementById('profile-tab-docs');
  if(notes&&docs&&!notes.contains(docs)){docs.id='profile-documents-section';docs.classList.remove('profile-tab');notes.appendChild(docs)}
  const view=document.getElementById('profileViewAllBtn');
  if(view)view.addEventListener('click',function(){location.hash='home'});
  document.addEventListener('click',function(e){if(e.target.closest('#profileTabs [data-tab]')){const more=document.querySelector('#profileTabs details');if(more)more.open=false}});
});
</script>
`;
  const closingBody=source.toLowerCase().lastIndexOf('</body>');
  if(closingBody<0)throw Error('COMPASS closing body tag missing');
  source=source.slice(0,closingBody)+bootstrap+source.slice(closingBody);
  for(const marker of ['compass-premium-grid','profileNextEvent','compass-premium-profile-bootstrap','Notes & Documents'])if(!source.includes(marker))throw Error('Premium profile verification: '+marker);
  return source;
};
