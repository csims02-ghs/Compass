'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1450,height:900}});
  await page.goto('http://127.0.0.1:8099/',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    const main=[...document.querySelectorAll('script:not([src])')].map(x=>x.textContent||'')
      .find(x=>x.includes('async function archiveSelectedAssignedPrograms('));
    check(main,'Edit Programs source missing');
    const start=main.indexOf('async function archiveSelectedAssignedPrograms(');
    const end=main.indexOf('function openLibraryAssign(){',start);
    check(start>=0&&end>start,'Cannot extract Edit Programs source');
    const studentId='qa-student';
    const sp={id:'qa-actions',student_id:studentId,program_id:'actions',status:'active',
      display_order:1,view_token:'synthetic-token',goal_percentage:80,
      instance_config:{programSetup:{goalSelect:'qa-g1',chainSelect:'TTTT'},customSettings:'keep'}};
    const goals=[
      {id:'qa-g1',student_id:studentId,title:'Communication',goal_area:'Speech',
        annual_goal_number:1,target_percent:80,status:'active'},
      {id:'qa-g2',student_id:studentId,title:'Receptive Actions',goal_area:'Communication',
        annual_goal_number:6,target_percent:75,status:'active'},
      {id:'qa-g3',student_id:studentId,title:'Generalization',goal_area:'Functional',
        annual_goal_number:null,target_percent:90,status:'active'}
    ];
    const state={currentStudent:{id:studentId},goals,goalLinks:[{goal_id:'qa-g1',student_compass_program_id:sp.id}],studentPrograms:[sp]};
    const calls=[],openCalls=[];let graphRefreshes=0;
    const db={
      from(table){
        const q={table,filters:[],data:null,
          update(payload){this.kind='update';this.payload=payload;return this},
          delete(){this.kind='delete';return this},
          insert(payload){this.kind='insert';this.payload=payload;calls.push({table,kind:'insert',payload});
            return Promise.resolve({data:payload,error:null})},
          eq(key,val){this.filters.push([key,val]);return this},
          in(key,val){this.filters.push([key,val]);calls.push({table,kind:'delete',filter:val});
            return Promise.resolve({error:null})},
          select(){this.kind='select';return this},
          maybeSingle(){
            calls.push({table,kind:'update',payload:this.payload,filters:this.filters});
            if(table==='student_compass_programs'){
              Object.assign(sp,{instance_config:this.payload.instance_config||sp.instance_config,
                goal_percentage:this.payload.goal_percentage??sp.goal_percentage});
              return Promise.resolve({data:{id:sp.id,instance_config:sp.instance_config,
                goal_percentage:sp.goal_percentage},error:null});
            }
            if(table==='student_iep_goals'){
              const id=this.filters.find(x=>x[0]==='id')?.[1];
              const g=goals.find(x=>x.id===id);Object.assign(g,this.payload);
              return Promise.resolve({data:{...g},error:null});
            }
            return Promise.resolve({data:null,error:{message:'Unexpected query'}});
          }
        };return q;
      }
    };
    const area=document.createElement('div');area.id='qa-edit-area';document.body.append(area);
    const frame=document.createElement('div'),backdrop=document.createElement('div');
    const find=id=>id==='modal'?frame:id==='modalBackdrop'?backdrop:area.querySelector('#'+id);
    const openModal=(_title,html,onReady)=>{area.innerHTML=html;onReady()};
    const fx=new Function('state','sb','activeStudentProgramsOrdered','programById','programDomain',
      'roleName','esc','openModal','$','toast','confirm','closeModal','loadStudentProfile',
      'moveAssignedProgram','removeAssignedProgram','renderGoals','renderPrograms','renderGoalAchievement','openStudentProgramHub',
      main.slice(start,end)+';return {openEditPrograms};');
    const app=fx(state,db,()=>[sp],()=>({program_name:'Actions'}),()=> 'Communication',
      x=>x,x=>String(x).replace(/[&<>"']/g,''),openModal,find,()=>{},()=>false,
      ()=>{},async()=>{},async()=>{},async()=>{},()=>{},()=>{},()=>{graphRefreshes++},
      async(...args)=>openCalls.push(args));
    app.openEditPrograms();
    const row=area.querySelector('.program-edit-row');
    check(row,'Program assignment row missing');
    check(row.children[0].classList.contains('program-edit-checkbox'),'Checkbox must be first');
    check(row.children[1].classList.contains('program-edit-details'),'Program name must follow checkbox');
    check(row.children[2].hasAttribute('data-edit-setup'),'Program Setup must follow program name');
    check(row.children[3].classList.contains('program-goals-control'),'IEP Goal controls must follow setup');
    check(area.querySelector('[data-primary-goal]').value==='qa-g1','Primary goal linkage not loaded');
    check(area.querySelector('[data-goal-number="qa-g1"]').value==='1','Stored IEP goal # missing');
    check(area.querySelector('[data-goal-percent="qa-g1"]').value==='80','Stored target % missing');
    const emit=(el,val)=>{el.value=val;el.dispatchEvent(new Event('change',{bubbles:true}))};
    const flush=()=>new Promise(r=>setTimeout(r,35));
    emit(area.querySelector('[data-goal-number="qa-g1"]'),'3');await flush();
    check(goals[0].annual_goal_number===3,'Goal number not persisted');
    emit(area.querySelector('[data-goal-percent="qa-g1"]'),'85');await flush();
    check(goals[0].target_percent===85,'IEP target % not persisted');
    check(sp.goal_percentage===85,'Primary program target % not updated');
    emit(area.querySelector('[data-primary-goal]'),'qa-g2');await flush();
    check(sp.instance_config.primary_iep_goal_id==='qa-g2','Primary goal not saved in assignment');
    check(sp.instance_config.programSetup.goalSelect==='qa-g2','Program Setup did not receive IEP primary goal');
    check(sp.instance_config.customSettings==='keep','Unrelated assignment config was erased');
    check(state.goalLinks.some(l=>l.goal_id==='qa-g1')&&state.goalLinks.some(l=>l.goal_id==='qa-g2'),'Previous IEP goal not kept for multiple-goal tracking');
    check(area.querySelector('[data-change-extra-goal]'),'Multiple-goal interface missing');
    emit(area.querySelector('[data-add-goal]'),'qa-g3');await flush();
    check(state.goalLinks.some(l=>l.goal_id==='qa-g3'),'Additional IEP goal failed to link');
    check(area.querySelector('[data-goal-number="qa-g3"]'),'Additional goal number field missing');
    check(area.querySelector('[data-goal-percent="qa-g3"]'),'Additional goal percentage field missing');
    check(calls.some(x=>x.table==='student_iep_goal_compass_programs'&&x.kind==='insert'),
      'Missing goal link insert');
    check(graphRefreshes>=2,'IEP graph did not refresh on goal changes');
    area.querySelector('[data-edit-setup]').click();await flush();
    check(openCalls.length===1&&openCalls[0][0]===sp.id&&openCalls[0][1]===studentId,
      'Program Setup did not open the selected assignment in the Program Hub');
    area.remove();
    return {program:sp.program_id,goalFields:true,number:goals[0].annual_goal_number,
      percent:goals[0].target_percent,selectedPrimary:sp.instance_config.primary_iep_goal_id,
      linkedGoals:state.goalLinks.map(x=>x.goal_id).length,graphRefreshes,
      keptOtherConfig:sp.instance_config.customSettings==='keep'};
  });
  console.log('EDIT_PROGRAMS_IEP_MATRIX_PASS',JSON.stringify(result));
 }finally{await browser.close()}
})().catch(e=>{console.error('EDIT_PROGRAMS_IEP_MATRIX_FAIL',e);process.exit(1)});
