/* COMPASS assigned-program IEP goal labels: read-only, sourced from the student profile's canonical links. */
(function(){
 'use strict';
 if(window.__compassAssignedGoalsV1)return;window.__compassAssignedGoalsV1=true;
 let scheduled=false;
 function clean(x){return String(x||'').replace(/\s+/g,' ').trim().toLowerCase()}
 function sync(){
   scheduled=false;
   const data=window.__compassProgressSnapshot;
   if(!data||!Array.isArray(data.programs)||!Array.isArray(data.goals)||!Array.isArray(data.goalLinks))return;
   const goals=new Map(data.goals.filter(g=>!g.student_id||g.student_id===data.studentId).map(g=>[g.id,g]));
   const links=new Map();
   for(const link of data.goalLinks){
      const goal=goals.get(link.goal_id);if(!goal)continue;
      if(!links.has(link.student_compass_program_id))links.set(link.student_compass_program_id,[]);
      links.get(link.student_compass_program_id).push(goal);
   }
   for(const table of document.querySelectorAll('table')){
     const headers=[...table.querySelectorAll('thead th')].map(th=>clean(th.textContent));
     const goalColumn=headers.indexOf('iep goal'),programColumn=headers.indexOf('program');
     if(goalColumn<0||programColumn<0||headers.indexOf('status')<0)continue;
     const orderColumn=headers.indexOf('order');
     const rows=[...table.querySelectorAll('tbody tr')];
     for(const row of rows){
       const cells=[...row.children].filter(el=>el.matches('td,th'));
       const goalCell=cells[goalColumn],programCell=cells[programColumn];
       if(!goalCell||!programCell||goalCell.querySelector('input,select,button'))continue;
       const progName=clean(programCell.textContent);
       const order=orderColumn>=0?Number(cells[orderColumn]?.textContent):null;
       const matches=data.programs.filter(item=>{
         const p=item.definition||{},name=clean(p.program_name||p.name||p.title);
         return name===progName;
       });
       const entry=matches.find(item=>Number(item.assignment?.display_order)===order)||matches[0];
       if(!entry)continue;
       const titles=[...new Set((links.get(entry.assignment?.id)||[]).map(g=>String(g.title||'IEP Goal').trim()))];
       const value=titles.length?titles.join(' · '):'—';
       if(goalCell.textContent.trim()!==value){goalCell.textContent=value;goalCell.title=titles.length?value:'No goal linked in Student Profile';}
     }
   }
 }
 function schedule(){if(scheduled)return;scheduled=true;setTimeout(sync,70)}
 window.addEventListener('compass-progress-data',schedule);
 document.addEventListener('click',()=>setTimeout(schedule,160),true);
 const observer=new MutationObserver(schedule);
 const start=()=>{if(document.body)observer.observe(document.body,{childList:true,subtree:true});schedule()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* TEMPORARY COMPASS PREVIEW ROUTING.
   Disable by setting ENABLED=false; the original Supabase staff login remains intact.
   Public Sign In opens a static read-only COMPASS shell with no Supabase connection.
*/
(function(){
  'use strict';
  const ENABLED=true;
  if(!ENABLED)return;
  let staffLoginRequested=new URLSearchParams(location.search).get('staff-login')==='1';
  const landing=()=>document.getElementById('landingScreen');
  function showStaffLogin(){
    const l=landing(),screen=document.getElementById('loginScreen'),app=document.getElementById('app');
    if(!l||!screen||!app)return;
    l.classList.add('hidden');screen.classList.remove('hidden');app.classList.add('hidden');
  }
  function init(){
    const nav=document.querySelector('.public-nav [data-show-login]');
    if(nav){nav.removeAttribute('data-show-login');nav.setAttribute('data-compass-staff-login','');nav.textContent='Staff Login'}
    const provider=[...document.querySelectorAll('[data-show-login]')].find(b=>b.textContent.trim()==='Provider Login');
    if(provider){provider.removeAttribute('data-show-login');provider.setAttribute('data-compass-staff-login','')}
    document.addEventListener('click',function(e){
      const staff=e.target.closest('[data-compass-staff-login]');
      if(staff){e.preventDefault();e.stopPropagation();staffLoginRequested=true;showStaffLogin();return}
      const publicSignin=e.target.closest('[data-show-login]');
      if(publicSignin && landing() && !landing().classList.contains('hidden')){
        e.preventDefault();e.stopPropagation();location.assign('./preview.html');
      }
    },true);
    const root=landing();
    if(root){
      new MutationObserver(function(){if(staffLoginRequested&&!root.classList.contains('hidden'))showStaffLogin()})
        .observe(root,{attributes:true,attributeFilter:['class']});
    }
    if(staffLoginRequested)showStaffLogin();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
