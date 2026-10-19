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
