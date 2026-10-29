'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('  const linkedIds=gid=>');
const end=html.indexOf('  function renderGoals(){',start);
const tableStart=html.indexOf('  function renderPrograms(){',end);
const tableEnd=html.indexOf('  function renderNotes(){',tableStart);
assert(start>0&&end>start&&tableStart>end&&tableEnd>tableStart,'Live profile/goal rendering functions missing');
const helpers=html.slice(start,end);
const render=html.slice(tableStart,tableEnd);
assert(html.includes("if(g.representative&&g.representative.status!=='archived')chosenAssignmentIds.add(g.representative.id)"),'Goals-page checked selections must link current assignment');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:1480,height:850}});
 await page.setContent('<table><tbody id="studentProgramsBody"></tbody></table><strong id="pAssigned"></strong><strong id="pActive"></strong><strong id="pMastered"></strong><strong id="pHold"></strong>');
 const result=await page.evaluate(({helpers,render})=>{
  const state={
   currentStudent:{id:'student-1'},
   studentPrograms:[{id:'sp1',student_id:'student-1',program_id:'animal',status:'active',display_order:1,goal_percentage:80,instance_config:{primary_iep_goal_id:'g1'}},{id:'sp2',student_id:'student-1',program_id:'body',status:'active',display_order:2,goal_percentage:80,instance_config:{primary_iep_goal_id:'old-stale'}}],
   goals:[
    {id:'g1',student_id:'student-1',title:'Pre Academic',annual_goal_number:1,status:'active'},
    {id:'g8',student_id:'student-1',title:'Communication',annual_goal_number:8,status:'active'},
    {id:'g2',student_id:'student-2',title:'Other Student',annual_goal_number:2,status:'active'}],
   goalLinks:[
    {goal_id:'g8',student_compass_program_id:'sp1'},
    {goal_id:'g1',student_compass_program_id:'sp1'},
    {goal_id:'g8',student_compass_program_id:'sp2'}],
   programCatalog:[{id:'animal',program_name:'Animal Identification'},{id:'body',program_name:'Body Parts'}]
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=id=>document.getElementById(id);
  const programById=id=>state.programCatalog.find(p=>p.id===id);
  const programDomain=()=> 'Receptive';
  const activeStudentProgramsOrdered=()=>state.studentPrograms.filter(sp=>sp.status!=='archived').sort((a,b)=>a.display_order-b.display_order);
  const fn=new Function('state','document','$','esc','programById','programDomain','activeStudentProgramsOrdered',helpers+'\n'+render+'\nreturn {renderPrograms,goalsForAssignedProgram};');
  const app=fn(state,document,$,esc,programById,programDomain,activeStudentProgramsOrdered);
  const cell=spid=>document.querySelector('[data-assigned-goals="'+spid+'"]');
  app.renderPrograms();
  if(cell('sp1')?.textContent!=='Pre Academic · Communication')throw Error('Expected both Goals-page selected titles in order');
  if(!cell('sp1').title.includes('IEP Goal 1: Pre Academic')||!cell('sp1').title.includes('IEP Goal 8: Communication'))throw Error('Missing annual goal numbers');
  if(cell('sp2')?.textContent!=='Communication')throw Error('Stale primary must not override actual goal link');
  state.goals.find(g=>g.id==='g8').title='Functional Communication';
  app.renderPrograms();
  if(cell('sp1')?.textContent!=='Pre Academic · Functional Communication')throw Error('Goal title changes do not refresh Assigned Programs');
  state.goalLinks=state.goalLinks.filter(l=>!(l.student_compass_program_id==='sp1'&&l.goal_id==='g1'));
  app.renderPrograms();
  if(cell('sp1')?.textContent!=='Functional Communication')throw Error('Uncheck goal did not remove goal from Assigned Programs');
  state.goalLinks=state.goalLinks.filter(l=>l.student_compass_program_id!=='sp1');
  app.renderPrograms();
  if(cell('sp1')?.textContent!=='—')throw Error('Unlinked program should show em dash');
  state.goalLinks.push({goal_id:'g2',student_compass_program_id:'sp1'});
  app.renderPrograms();
  if(cell('sp1')?.textContent!=='—')throw Error('Another student\'s goal must never appear');
  return {checkedRows:2,multiGoal:true,titleRename:true,unlink:true,studentIsolation:true,stalePrimaryIgnored:true};
 },{helpers,render});
 console.log('COMPASS_IEP_GOALS_ASSIGNED_SYNC_PASS',JSON.stringify(result));
 await page.close();
}finally{await browser.close()}
})().catch(e=>{console.error('COMPASS_IEP_GOALS_ASSIGNED_SYNC_FAIL',e);process.exit(1)});
