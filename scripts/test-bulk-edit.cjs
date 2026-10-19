const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage({viewport:{width:1440,height:950}});
await page.goto('http://127.0.0.1:8099/',{waitUntil:'domcontentloaded'});
const result=await page.evaluate(async()=>{
 const check=(v,m)=>{if(!v)throw new Error(m)};
 const main=[...document.querySelectorAll('script:not([src])')].map(x=>x.textContent||'').find(x=>x.includes('async function archiveSelectedAssignedPrograms('));
 check(main,'bulk code missing');
 const start=main.indexOf('async function archiveSelectedAssignedPrograms(');
 const end=main.indexOf('function openLibraryAssign(){',start);
 check(start>=0&&end>start,'incomplete bulk functions');
 const source=main.slice(start,end);
 const records=['aa','bb','cc'].map((id,i)=>({id,student_id:'fake-student',program_id:id,status:'active',goal_percentage:80,display_order:i+1}));
 const calls=[];let allowed=false,confirmations=0,loadCount=0;
 const mockQuery={
  update(v){calls.push({type:'update',v});return this},
  eq(k,v){calls.push({type:'eq',k,v});return this},
  in(k,v){calls.push({type:'in',k,v});return this},
  neq(k,v){calls.push({type:'neq',k,v});return this},
  select(){const ids=calls.find(x=>x.type==='in').v;return Promise.resolve({data:ids.map(id=>({id})),error:null})}
 };
 const mockSupabase={from(t){calls.push({type:'from',table:t});return mockQuery}};
 const area=document.createElement('div');area.id='bulk-test-area';document.body.append(area);
 const openModal=(title,html,ready)=>{area.innerHTML=html;ready()};
 const find=id=>area.querySelector('#'+id);
 const fn=new Function('state','sb','activeStudentProgramsOrdered','programById','programDomain','roleName',
 'esc','openModal','$','toast','confirm','closeModal','loadStudentProfile','moveAssignedProgram','removeAssignedProgram',
 source+';return {openEditPrograms,archiveSelectedAssignedPrograms};');
 const app=fn({currentStudent:{id:'fake-student'},studentPrograms:records},mockSupabase,()=>records,
 x=>({program_name:'Program '+x}),()=> 'Receptive',s=>s,s=>s,openModal,find,()=>{},()=>{confirmations++;return allowed},
 ()=>area.replaceChildren(),async()=>{loadCount++},()=>{},()=>{});
 app.openEditPrograms();
 check(find('programBulkRemove').disabled,'Remove Selected should start disabled');
 check(area.querySelectorAll('input[data-select-assigned]').length===3,'checkboxes missing');
 check(area.querySelectorAll('[data-remove-assigned]').length===3,'individual remove buttons missing');
 find('programSelectAll').click();
 check(find('programSelectionCount').textContent==='3 of 3 selected','select all failed');
 find('programClearSelection').click();
 check(find('programSelectionCount').textContent==='0 of 3 selected','clear failed');
 for(const input of [...area.querySelectorAll('input[data-select-assigned]')].slice(0,2)){
   input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));
 }
 check(find('programBulkRemove').textContent.includes('(2)'),'count failed');
 find('programBulkRemove').click();
 await new Promise(resolve=>setTimeout(resolve,15));
 check(confirmations===1&&calls.length===0,'cancel triggered database update');
 allowed=true;find('programBulkRemove').click();
 await new Promise(resolve=>setTimeout(resolve,25));
 check(calls.filter(x=>x.type==='from').length===1,'expected one bulk update');
 check(calls.find(x=>x.type==='from').table==='student_compass_programs','wrong table');
 check(calls.find(x=>x.type==='update').v.status==='archived','not soft archive');
 check(calls.find(x=>x.type==='eq'&&x.k==='student_id').v==='fake-student','not student scoped');
 check(calls.find(x=>x.type==='in').v.join(',')==='aa,bb','wrong IDs');
 check(loadCount===1,'profile not reloaded');
 area.remove();
 return {selected:2,confirmations,writeCalls:1,historyPreserved:true};
});
console.log('BULK_EDIT_SMOKE_PASS '+JSON.stringify(result));
}finally{await browser.close()}
})().catch(e=>{console.error('BULK_EDIT_SMOKE_FAIL',e);process.exit(1)});
