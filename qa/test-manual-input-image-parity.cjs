const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('manual-input-workspace.css','utf8');
const js=fs.readFileSync('manual-input-workspace.js','utf8');
const progress=fs.readFileSync('progress-profile-live-v1.js','utf8');
const bridge=fs.readFileSync('manual-progress-sync.js','utf8');
const start=html.indexOf('<section id="page-sessions" class="page">'),end=html.indexOf('<section id="page-assessments"',start);
assert(start>=0&&end>start,'Manual UI must exist in live index');
const fragment=html.slice(start,end);
const ids=['miStudent','miProgram','miDate','miProvider','miProviderManual','miLocation','miService','miTime','miChain','miBenchmark','miTarget','miTrial','miTrialType','miGoal','miBehaviors','miPrompt','miNotes','miSave','miFilterStudent','miFilterProgram','miFilterFrom','miFilterTo','miFilterProvider','miApplyFilter','miClearFilters','miHistoryRows','miStats','miBehaviorStats','miGraphToggle','miGraph','miPrev','miNext','miDeleteSelected'];
ids.forEach(id=>assert(fragment.includes('id="'+id+'"'),id+' missing from visual reference'));
assert(fragment.includes('Student Data History'),'Exact history header missing');
assert(fragment.indexOf('<th>Source</th>')<fragment.indexOf('<th>Notes</th>'),'Source column must precede Notes');
assert(html.includes('manual-progress-sync.js?v=1'));
const tmpl='<!doctype html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+fragment+'</body></html>';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const width of [1536,1200,700]){
 const page=await browser.newPage({viewport:{width,height:1024}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('about:blank');await page.setContent(tmpl,{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  const students=[{id:'a',display_label:'Sample Student A',selected_behaviors:['Non-Compliance','Elopement'],secondary_behaviors:[],status:'active'},{id:'b',display_label:'Sample Student B',selected_behaviors:['Property'],secondary_behaviors:[],status:'active'}];
  const assignments=[{id:'assign-a',student_id:'a',program_id:'prog-a',status:'active',assigned_date:'2026-10-01'},{id:'assign-b',student_id:'b',program_id:'prog-b',status:'active',assigned_date:'2026-10-01'}];
  const programs=[{id:'prog-a',program_name:'Colors',program_config:{targets:[{id:1,name:'Red',metadata:{benchmark:1}},{id:2,name:'Blue',metadata:{benchmark:1}}],benchmark_sets:[{label:'Colors 1–2',start:1,end:2}]}},{id:'prog-b',program_name:'Shapes',program_config:{targets:[{id:1,name:'Circle'}]}}];
  const profiles=[{id:'staff1',full_name:'Staff One',role:'bcba',active:true},{id:'staff2',full_name:'Staff Two',role:'teacher',active:true}];
  const sessions=[{id:'sess-a',student_compass_program_id:'assign-a',staff_id:'staff1',session_date:'2026-10-23',trials_total:1,targets_correct:1,prompted_correct:0,incorrect:0,no_response:0,behavior_counts:{'Non-Compliance':1},notes:'Live session'}];
  const trialEvents=[{id:'trial-live',session_id:'sess-a',student_compass_program_id:'assign-a',trial_number:1,trial_type:'T',target_key:'1',target_name:'Red',benchmark_key:'1',result:'independent_correct',prompt_level:'None',behavior_counts:{'Non-Compliance':1},occurred_at:'2026-10-23T09:15:00Z',source:'Live session'}];
  const behavior=[{id:'beh1',student_id:'a',data_type:'frequency',behavior_name:'Elopement',data_date:'2026-10-22',count:2,notes:'Behavior observation',collected_by:'staff1'}];
  const manual=[{id:'manual-old',student_id:'a',student_compass_program_id:'assign-a',created_by:'staff1',event_date:'2026-10-21',event_time:'09:30',provider_name:'Staff One',provider_user_id:'staff1',provider_entry_type:'directory',target_key:'1',target_name:'Red',trial_number:1,trial_type:'T',response:'prompted',prompt_level:'Gestural',behavior_counts:{Elopement:1},notes:'Existing manual',source:'manual'}];
  const goals=[{id:'goal-a',student_id:'a',title:'Match colors',created_at:'2026-10-01'}];
  const db={students,student_compass_programs:assignments,compass_programming_programs:programs,compass_programming_targets:[],profiles,student_iep_goals:goals,compass_program_sessions:sessions,compass_trial_events:trialEvents,student_behavior_data:behavior,compass_manual_trial_entries:manual};
  let counter=0;window.db=db;window.changes=0;window.confirm=()=>true;
  window.COMPASS_MANUAL_BRIDGE={
   query(name){
    if(!db[name])throw Error('Unknown table '+name);
    const filters=[],orders=[],self={op:'read',payload:null,fields:'*'};
    const chain={
     select(fields){self.fields=fields;return chain},
     eq(k,v){filters.push(r=>String(r[k])===String(v));return chain},
     is(k,v){filters.push(r=>r[k]==null=== (v===null));return chain},
     in(k,v){filters.push(r=>v.includes(r[k]));return chain},
     order(k,opt){orders.push({k,asc:!!opt?.ascending});return chain},
     range(a,b){self.range=[a,b];return chain},
     update(payload){self.op='update';self.payload=payload;return chain},
     insert(payload){self.op='insert';self.payload=payload;return chain},
     then(resolve,reject){
      const run=()=>{
       let rows=db[name].filter(r=>filters.every(f=>f(r)));
       if(self.op==='insert'){
        if(self.payload.student_id!==db.student_compass_programs.find(x=>x.id===self.payload.student_compass_program_id)?.student_id)throw Error('RLS assignment/student mismatch');
        const record={id:'manual-new-'+(++counter),...self.payload,source:'manual',deleted_at:null};
        db[name].push(record);rows=[record];
       }else if(self.op==='update'){
        rows=rows.map(r=>Object.assign(r,self.payload));
       }else{
        orders.forEach(o=>rows.sort((a,b)=>String(a[o.k]||'').localeCompare(String(b[o.k]||''))*(o.asc?1:-1)));
        if(self.range)rows=rows.slice(self.range[0],self.range[1]+1);
       }
       return {data:rows,error:null};
      };
      return Promise.resolve().then(run).then(resolve,reject);
     }
    };return chain;
   },
   context(){return {currentStudentId:'a',userId:'staff1',providerName:'Staff One',role:'bcba'}},
   notify(){window.changes++;window.dispatchEvent(new CustomEvent('compass-manual-record-changed'))}
  };
 });
 await page.addScriptTag({content:js});
 await page.locator('#sessionTabManual').click();
 await page.waitForFunction(()=>document.querySelector('#miHistoryRows')?.textContent.includes('Existing manual'),null,{timeout:8000});
 assert.equal(await page.locator('#miStudent').inputValue(),'a');
 assert.equal(await page.locator('#miProgram').inputValue(),'assign-a');
 assert.equal(await page.locator('#miFilterStudent').inputValue(),'a');
 assert.equal(await page.locator('#miHistoryRows tr').count(),3,'manual/live/behavior observation');
 assert((await page.locator('#miHistoryRows').innerText()).includes('Live session'));
 assert((await page.locator('#miHistoryRows').innerText()).includes('Behavior observation'));
 await page.locator('#miProvider').selectOption('manual');
 await page.locator('#miProviderManual').fill('Test Provider');
 await page.locator('#miDate').fill('2026-10-27');
 await page.locator('#miTarget').selectOption('2');
 await page.locator('#miForm [data-response="independent"]').click();
 await page.locator('#miBehaviors input[value="Elopement"]').check();
 await page.locator('#miNotes').fill('Independently identified Blue');
 await page.locator('#miSave').click();
 await page.waitForFunction(()=>window.db.compass_manual_trial_entries.length===2&&document.querySelector('#miHistoryRows')?.textContent.includes('Test Provider'),null,{timeout:8000});
 const saved=await page.evaluate(()=>window.db.compass_manual_trial_entries.at(-1));
 assert.equal(saved.student_id,'a');assert.equal(saved.student_compass_program_id,'assign-a');
 assert.equal(saved.target_key,'2');assert.equal(saved.provider_name,'Test Provider');assert.equal(saved.provider_entry_type,'manual');assert.equal(saved.behavior_counts.Elopement,1);
 assert.equal(await page.locator('#miHistoryRows tr').count(),4,'new row added to all-student history');
 await page.locator('#miGraphToggle').click();assert.equal(await page.locator('#miGraph').isVisible(),true);
 assert((await page.locator('#miGraph').innerText()).includes('Manual and live'));
 await page.locator('[data-mi-edit="manual:'+saved.id+'"]').click();
 assert.equal(await page.locator('#miSave').innerText(),'Save Changes');
 assert.equal(await page.locator('#miProgram').inputValue(),'assign-a');
 await page.locator('#miNotes').fill('Edited documented note');
 await page.locator('#miSave').click();
 await page.waitForFunction(()=>document.querySelector('#miHistoryRows')?.textContent.includes('Edited documented note'),null,{timeout:8000});
 await page.locator('[data-mi-delete="manual:'+saved.id+'"]').click();
 await page.waitForFunction(()=>window.db.compass_manual_trial_entries.at(-1)?.deleted_at&&document.querySelector('#miHistoryRows')?.textContent.includes('Existing manual')&&!document.querySelector('#miHistoryRows')?.textContent.includes('Edited documented note'),null,{timeout:8000});
 assert.equal(await page.locator('#miHistoryRows tr').count(),3,'soft deletion removed from current history');
 assert.equal(await page.evaluate(()=>window.db.compass_manual_trial_entries.length),2,'audited deleted record not hard deleted');
 assert((await page.evaluate(()=>window.changes))>=3,'create edit delete notifications');
 await page.locator('#miFilterStudent').selectOption('b');
 await page.waitForFunction(()=>document.querySelector('#miProgram')?.value==='assign-b');
 assert.equal(await page.locator('#miFilterStudent').inputValue(),'b');
 assert.equal(await page.locator('#miHistoryRows tr').count(),1,'other student history empty');
 assert.equal(await page.locator('#miHistoryRows').innerText().then(t=>t.includes('Existing manual')),false,'student isolation');
 assert.equal(errors.length,0,errors.join('; '));
 console.log('PASS Manual Input',width,'image markers','student-linked CRUD','provider manual','behavior tracking','live+manual+behavior history','graph','soft-delete','other-student isolation');
 await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
