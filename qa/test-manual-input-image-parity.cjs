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
assert(fragment.includes('<th>Targets</th><th>Accuracy</th><th>Behaviors</th>'),'Session table must contain separate Targets, Accuracy and Behaviors columns');
assert(!fragment.includes('<th>Trial</th><th>Response</th>'),'Raw trial and response columns should be removed');
assert(/manual-progress-sync\.js\?v=\S+/.test(html),'Current progress loader must be present');
assert(fragment.includes('id="miChainScoring"'),'Full-chain scoring panel must be present');
const tmpl='<!doctype html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+fragment+'</body></html>';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const width of [1536,1200,700]){
 const page=await browser.newPage({viewport:{width,height:1024}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('about:blank');await page.setContent(tmpl,{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  const students=[{id:'a',display_label:'Sample Student A',selected_behaviors:['Non-Compliance','Elopement','Aggression (Peer)','Leaving the area','Work avoidance','Stealing'],secondary_behaviors:[],status:'active'},{id:'b',display_label:'Sample Student B',selected_behaviors:['Property'],secondary_behaviors:[],status:'active'}];
  const assignments=[{id:'assign-a',student_id:'a',program_id:'prog-a',status:'active',assigned_date:'2026-10-01'},{id:'assign-b',student_id:'b',program_id:'prog-b',status:'active',assigned_date:'2026-10-01'}];
  const programs=[{id:'prog-a',program_name:'Colors',program_config:{targets:[{id:1,name:'Red',metadata:{benchmark:1}},{id:2,name:'Blue',metadata:{benchmark:1}}],benchmark_sets:[{label:'Colors 1–2',start:1,end:2}]}},{id:'prog-b',program_name:'Shapes',program_config:{targets:[{id:1,name:'Circle'}]}}];
  const profiles=[{id:'staff1',full_name:'Staff One',role:'bcba',active:true},{id:'staff2',full_name:'Staff Two',role:'teacher',active:true}];
  const sessions=[{id:'sess-a',student_compass_program_id:'assign-a',staff_id:'staff1',session_date:'2026-10-23',trials_total:5,targets_correct:2,prompted_correct:0,incorrect:3,no_response:0,behavior_counts:{Tantrums:5,'Leaving the area':2,Noncompliance:1},notes:'Live session'},{id:'sess-summary',student_compass_program_id:'assign-a',staff_id:'staff1',session_date:'2026-10-20',trials_total:2,targets_correct:1,prompted_correct:0,incorrect:1,no_response:0,behavior_counts:{},notes:'Session summary only'}];
  const trialEvents=['independent_correct','incorrect','independent_correct','incorrect','incorrect'].map((result,i)=>({
   id:'trial-live-'+(i+1),session_id:'sess-a',student_compass_program_id:'assign-a',trial_number:i+1,
   trial_type:'T',target_key:'1',target_name:'Red',benchmark_key:'1',result,prompt_level:'None',
   behavior_counts:{},occurred_at:'2026-10-23T09:15:00Z',source:'Live session'
  }));
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
     update(payload,opts){self.op='update';self.payload=payload;self.countRequested=opts?.count;return chain},
     insert(payload){self.op='insert';self.payload=payload;return chain},
     then(resolve,reject){
      const run=()=>{
       let rows=db[name].filter(r=>filters.every(f=>f(r)));
       if(self.op==='insert'){
        if(self.payload.student_id!==db.student_compass_programs.find(x=>x.id===self.payload.student_compass_program_id)?.student_id)throw Error('RLS assignment/student mismatch');
        const record={id:'manual-new-'+(++counter),...self.payload,source:'manual',deleted_at:null};
        db[name].push(record);rows=[record];
       }else if(self.op==='update'){
        rows=rows.map(r=>{
          if(name==='compass_trial_events'&&self.payload.deleted_at&&!r.deleted_at){
            const parent=db.compass_program_sessions.find(session=>session.id===r.session_id);
            if(parent){
              parent.trials_total=Math.max(0,Number(parent.trials_total||0)-1);
              if(r.result==='independent_correct')parent.targets_correct=Math.max(0,Number(parent.targets_correct||0)-1);
            }
          }
          return Object.assign(r,self.payload);
        });
       }else{
        orders.forEach(o=>rows.sort((a,b)=>String(a[o.k]||'').localeCompare(String(b[o.k]||''))*(o.asc?1:-1)));
        if(self.range)rows=rows.slice(self.range[0],self.range[1]+1);
       }
       return {data:rows,error:null,count:self.countRequested==='exact'?rows.length:null};
      };
      return Promise.resolve().then(run).then(resolve,reject);
     }
    };return chain;
   },
   context(){return {currentStudentId:'a',userId:'staff1',providerName:'Staff One',role:'bcba'}},
   notify(){window.changes++;window.dispatchEvent(new CustomEvent('compass-manual-record-changed'))}
  };
 });
 await page.addScriptTag({content:fs.readFileSync('session-notes-tabs.js','utf8')});
 await page.addScriptTag({content:js});
 await page.locator('#sessionTabManual').click();
 await page.waitForFunction(()=>!!document.querySelector('#miHistoryRows [data-mi-select="manual:manual-old"]'),null,{timeout:8000});
 assert.equal(await page.locator('#miStudent').inputValue(),'a');
 assert.equal(await page.locator('#miProgram').inputValue(),'assign-a');
 assert.equal(await page.locator('#miFilterStudent').inputValue(),'a');
 assert.equal(await page.locator('#miHistoryRows tr').count(),4,'manual/live/session summary/behavior observation');
 assert.equal(await page.locator('#miHistoryRows tr[title="Live session"]').count(),1,'Five scored trials must collapse to exactly one session row');
 assert.equal(await page.locator('#miHistoryRows [data-mi-select="session:sess-a"]').count(),1);
 const sess=page.locator('#miHistoryRows tr:has([data-mi-select="session:sess-a"])');
 assert((await sess.innerText()).includes('2/5 Correct'),'Display 2/5 Correct from five real trials');
 assert((await sess.innerText()).includes('40%'),'Display 40% separately from target count');
 for(const behaviorText of ['Tantrums (5)','Noncompliance (1)','Leaving the area (2)'])
  assert((await sess.innerText()).includes(behaviorText),'Session behavior pill missing: '+behaviorText);
 assert.equal(await sess.locator('.mi-chip.behavior').count(),3,'Show all saved behaviors without duplicating per-trial counts');
 assert.equal(await page.locator('#miHistoryRows [data-mi-select="behavior:beh1"]').count(),1,'Keep unassigned behavior observation as a distinct record');
 await page.locator('#miProvider').selectOption('manual');
 await page.locator('#miProviderManual').fill('Test Provider');
 await page.locator('#miDate').fill('2026-10-27');
 await page.locator('#miTarget').selectOption('2');
 await page.locator('#miTrialType').selectOption('T'); // Existing single-trial CRUD remains supported.
 await page.locator('#miForm [data-response="independent"]').click();
 // Reference layout: one full-width row per behavior, checkbox on left,
 // large minus / frequency / plus controls on the right.
 const layout=await page.locator('#miBehaviors').evaluate(grid=>{
  const rows=[...grid.querySelectorAll('[data-mi-behavior-name]')],one=rows[0],two=rows[1];
  const rect=e=>e.getBoundingClientRect();
  const box=rect(one),check=rect(one.querySelector('input[type="checkbox"]')),
    minus=rect(one.querySelector('[data-mi-behavior-delta="-1"]')),
    count=rect(one.querySelector('output')),plus=rect(one.querySelector('[data-mi-behavior-delta="1"]'));
  return {rowStacked:rows.length>1&&rect(two).top>box.bottom-1,inside:plus.right<=box.right+2,
    order:check.left<minus.left&&minus.left<count.left&&count.left<plus.left,
    checkbox:check.width>=22,minusWidth:minus.width>=29,plusWidth:plus.width>=29,
    singleColumn:getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length===1};
 });
 assert(layout.rowStacked&&layout.inside&&layout.order&&layout.checkbox&&layout.minusWidth&&layout.plusWidth&&layout.singleColumn,
  'Behavior row screenshot parity failed '+JSON.stringify(layout));
 // Reproduce the narrow/zoomed 280px entry area in the user screenshot.
 // Every behavior name must stay on a single visible line; controls must remain in-row.
 const narrow=await page.locator('#miBehaviors').evaluate(grid=>{
  const prev=grid.style.width;
  grid.style.width='280px';
  const all=[...grid.querySelectorAll('[data-mi-behavior-name]')].map(row=>{
   const label=row.querySelector('.mi-behavior-name'),check=row.querySelector('.mi-behavior-check'),
    ctr=row.querySelector('.mi-behavior-counter');
   const rr=row.getBoundingClientRect(),lr=label.getBoundingClientRect(),cr=ctr.getBoundingClientRect(),
    ck=check.getBoundingClientRect();
   const style=getComputedStyle(label);
   return {behavior:row.dataset.miBehaviorName,whiteSpace:style.whiteSpace,fontSize:parseFloat(style.fontSize),
    noTextClip:label.scrollWidth<=label.clientWidth+1,
    noOverlap:lr.right<=cr.left+2,
    inside:cr.right<=rr.right+1&&ck.left>=rr.left-1,
    noWrap:lr.height<=parseFloat(style.lineHeight)+1};
  });
  grid.style.width=prev;
  return all;
 });
 assert(narrow.length>=6,'Screenshot reference behaviors should be included');
 for(const item of narrow)assert(item.whiteSpace==='nowrap'&&item.fontSize<=12&&item.noTextClip&&item.noOverlap&&item.inside&&item.noWrap,
  'Behavior text must remain fully visible on one line at 280px: '+JSON.stringify(item));
 const elopementCheckbox=page.locator('#miBehaviors [data-mi-behavior-name="Elopement"] .mi-behavior-check');
 assert.equal(await elopementCheckbox.isChecked(),false);
 await elopementCheckbox.check();
 assert.equal(await page.locator('#miBehaviors [data-mi-behavior-name="Elopement"] output').innerText(),'1','Checking an empty behavior should record one occurrence');
 await elopementCheckbox.uncheck();
 assert.equal(await page.locator('#miBehaviors [data-mi-behavior-name="Elopement"] output').innerText(),'0','Unchecking should reset frequency to zero');

 
  // Multiple independent behavior frequencies are captured in the same record.
  const plus=async(name,n)=>{for(let j=0;j<n;j++)await page.locator('#miBehaviors [data-mi-behavior-name="'+name+'"] [data-mi-behavior-delta="1"]').click()};
  const minus=async(name,n)=>{for(let j=0;j<n;j++)await page.locator('#miBehaviors [data-mi-behavior-name="'+name+'"] [data-mi-behavior-delta="-1"]').click()};
  await plus('Non-Compliance',4);
  await plus('Elopement',3);
  await minus('Elopement',1);
  assert.equal(await elopementCheckbox.isChecked(),true,'Plus checks the behavior automatically');
  assert.equal(await page.locator('#miBehaviors [data-mi-behavior-name="Non-Compliance"] output').innerText(),'4');
  assert.equal(await page.locator('#miBehaviors [data-mi-behavior-name="Elopement"] output').innerText(),'2');
  assert.equal(await page.locator('#miBehaviors [data-mi-behavior-name="Non-Compliance"] button[data-mi-behavior-delta="-1"]').isEnabled(),true);

 await page.locator('#miNotes').fill('Independently identified Blue');
 await page.locator('#miSave').click();
 await page.waitForFunction(()=>window.db.compass_manual_trial_entries.length===2&&document.querySelector('#miHistoryRows')?.textContent.includes('Test Provider'),null,{timeout:8000});
 const saved=await page.evaluate(()=>window.db.compass_manual_trial_entries.at(-1));
 assert.equal(saved.student_id,'a');assert.equal(saved.student_compass_program_id,'assign-a');
 assert.equal(saved.target_key,'2');assert.equal(saved.provider_name,'Test Provider');assert.equal(saved.provider_entry_type,'manual');assert.deepEqual(saved.behavior_counts,{'Non-Compliance':4,Elopement:2});
 assert.equal(await page.locator('#miHistoryRows tr').count(),5,'new row added to all-student history');
 await page.locator('#miGraphToggle').click();assert.equal(await page.locator('#miGraph').isVisible(),true);
 assert((await page.locator('#miGraph').innerText()).includes('Manual and live'));
 await page.locator('[data-mi-edit="manual:'+saved.id+'"]').click();
 assert.equal(await page.locator('#miSave').innerText(),'Save Changes');
 assert.equal(await page.locator('#miProgram').inputValue(),'assign-a');
 assert.equal(await page.locator('#miBehaviors [data-mi-behavior-name="Non-Compliance"] output').innerText(),'4','Must restore stored frequency on edit');
 assert.equal(await page.locator('#miBehaviors [data-mi-behavior-name="Elopement"] output').innerText(),'2');
 assert.equal(await page.locator('#miBehaviors [data-mi-behavior-name="Elopement"] .mi-behavior-check').isChecked(),true,'Editing restores checkbox selection');
 await minus('Non-Compliance',1);
 await plus('Elopement',2);
 await page.locator('#miNotes').fill('Edited documented note');
 await page.locator('#miSave').click();
 await page.waitForFunction(()=>!!document.querySelector('#miHistoryRows tr[title="Edited documented note"]'),null,{timeout:8000});
 const adjusted=await page.evaluate(id=>window.db.compass_manual_trial_entries.find(x=>x.id===id)?.behavior_counts,saved.id);
 assert.deepEqual(adjusted,{'Non-Compliance':3,Elopement:4});
 const behaviorHistory=await page.locator('#miHistoryRows tr[title="Edited documented note"]').innerText();
 assert(behaviorHistory.includes('Non-Compliance (3)')&&behaviorHistory.includes('Elopement (4)'),'History should show independently tallied occurrence counts');
 await page.locator('[data-mi-delete="manual:'+saved.id+'"]').click();
 await page.waitForFunction(()=>window.db.compass_manual_trial_entries.at(-1)?.deleted_at&&!!document.querySelector('#miHistoryRows tr[title="Existing manual"]')&&!document.querySelector('#miHistoryRows tr[title="Edited documented note"]'),null,{timeout:8000});
 assert.equal(await page.locator('#miHistoryRows tr').count(),4,'soft deletion removed from current history');
 assert.equal(await page.evaluate(()=>window.db.compass_manual_trial_entries.length),2,'audited deleted record not hard deleted');
 assert.equal(await page.locator('#miHistoryRows tr').count(),4,'manual, live trial, summary and behavior rows remain');
 assert((await page.locator('#miBehaviorStats').innerText()).includes('occurrences'),'Behavior summary is a frequency, not a percent of trials');
 assert.equal(await page.locator('#miHistoryRows td.mi-record-date').first().innerText(),'10/23/2026','Displayed date is MM/DD/YYYY');
 const firstDate=await page.locator('#miHistoryRows td.mi-record-date').first().evaluate(e=>({height:e.getBoundingClientRect().height,whiteSpace:getComputedStyle(e).whiteSpace}));
 assert.equal(firstDate.whiteSpace,'nowrap','Date column must not wrap');
 assert.equal(await page.locator('#miHistoryRows [data-mi-select="session:sess-a"]').isEnabled(),true,'One program session must be selectable');
 await page.locator('#miHistoryRows [data-mi-select="session:sess-a"]').check();
 assert.equal(await page.locator('#miDeleteSelected').isEnabled(),true,'Bulk archive enables when one program session selected');
 await page.locator('#miDeleteSelected').click();
 await page.waitForFunction(()=>window.db.compass_trial_events.every(x=>x.deleted_at)&&window.db.compass_program_sessions[0].deleted_at&&document.querySelectorAll('#miHistoryRows tr').length===3,null,{timeout:8000});
 assert.equal(await page.locator('#miHistoryRows tr[title="Live session"]').count(),0,'Archived session is hidden');
 assert.equal(await page.evaluate(()=>window.db.compass_trial_events.length),5,'All five recorded trials retained with archive timestamps');
 assert.equal(await page.evaluate(()=>window.db.compass_trial_events.every(t=>t.deleted_by==='staff1')),true,'All five trial audits attributed to same staff');
 // Both formerly read-only kinds must have enabled checkboxes and archive actions.
 assert.equal(await page.locator('[data-mi-select="session:sess-summary"]').isEnabled(),true,'Session summary selectable');
 assert.equal(await page.locator('[data-mi-select="behavior:beh1"]').isEnabled(),true,'Behavior observation selectable');
 assert.equal(await page.locator('[data-mi-delete="session:sess-summary"]').isEnabled(),true,'Session summary archive action enabled');
 assert.equal(await page.locator('[data-mi-delete="behavior:beh1"]').isEnabled(),true,'Behavior archive action enabled');
 await page.locator('[data-mi-select="session:sess-summary"]').check();
 await page.locator('[data-mi-select="behavior:beh1"]').check();
 await page.locator('#miDeleteSelected').click();
 await page.waitForFunction(()=>window.db.compass_program_sessions.find(s=>s.id==='sess-summary')?.deleted_at
     &&window.db.student_behavior_data.find(b=>b.id==='beh1')?.deleted_at
     &&document.querySelectorAll('#miHistoryRows tr').length===1,null,{timeout:8000});
 assert.equal(await page.locator('#miHistoryRows').innerText().then(t=>t.includes('Read-only')),false,'No obsolete Read-only label');
 assert.equal(await page.evaluate(()=>window.db.compass_program_sessions.length),2,'Summary archived, not hard deleted');
 assert.equal(await page.evaluate(()=>window.db.student_behavior_data.length),1,'Behavior event archived, not hard deleted');



 // V25 complete Default chain: five targets, three distractors, scored separately.
 await page.locator('#miProvider').selectOption('staff1');
 await page.locator('#miTrialType').selectOption('chain');
 await page.locator('#miChain').selectOption('T,T,D,T,D,D,T,T');
 await page.locator('#miTarget').selectOption('1');
 assert.equal(await page.locator('#miChainPreview .mi-chain-step.target').count(),5);
 assert.equal(await page.locator('#miChainPreview .mi-chain-step.distractor').count(),3);
 await page.locator('#miSave').click();
 assert((await page.locator('#miFeedback').innerText()).includes('Score every target'),'Do not persist incomplete chains');
 const seq=['independent','independent','independent','prompted','incorrect','independent','independent','independent'];
 // T at 1,2,4,7,8 -> 4 correct, 1 incorrect; D at 3,5,6 independently scored.
 for(let i=0;i<8;i++)
  await page.locator('[data-chain-step="'+i+'"][data-chain-response="'+seq[i]+'"]').click();
 await page.locator('[data-chain-prompt="3"]').selectOption('Gestural');
 assert((await page.locator('#miChainSummary').innerText()).includes('4/5 Correct · 80%'));
 assert((await page.locator('#miChainPreview .mi-chain-step.target').nth(2).innerText()).includes('Prompted · Incorrect'),'Prompting is identified as incorrect in step review');
 await page.locator('#miSave').click();
 await page.waitForFunction(()=>window.db.compass_manual_trial_entries.some(x=>Array.isArray(x.chain_steps)&&x.chain_steps.length===8),null,{timeout:8000});
 const defaultChain=await page.evaluate(()=>window.db.compass_manual_trial_entries.find(x=>x.chain_steps?.length===8));
 assert.equal(defaultChain.chain_steps.filter(x=>x.trial_type==='T').length,5);
 assert.equal(defaultChain.chain_steps.filter(x=>x.trial_type==='D').length,3);
 assert.equal(defaultChain.chain_steps[3].response,'prompted');
 assert.equal(defaultChain.chain_steps[3].prompt_level,'Gestural','Retain prompt detail rather than discarding it');
 assert((await page.locator('#miStats').innerText()).includes('Incorrect (incl. Prompted)'),'Summary labels prompted as an incorrect result');
 assert((await page.locator('#miStats').innerText()).includes('Prompted (Incorrect)'),'Summary retains prompted subtype');
 const defaultRow=page.locator('#miHistoryRows tr:has([data-mi-edit="manual:'+defaultChain.id+'"])');
 assert((await defaultRow.innerText()).includes('4/5 Correct'));
 assert((await defaultRow.innerText()).includes('80%'));
 await defaultRow.locator('[data-mi-edit]').click();
 assert.equal(await page.locator('#miChainPreview .mi-chain-step').count(),8,'Chain editor must restore all eight steps');
 await page.locator('[data-chain-step="0"][data-chain-response="incorrect"]').click();
 assert((await page.locator('#miChainSummary').innerText()).includes('3/5 Correct · 60%'));
 await page.locator('#miSave').click();
 await page.waitForFunction(id=>window.db.compass_manual_trial_entries.find(x=>x.id===id)?.chain_steps?.[0]?.response==='incorrect',defaultChain.id,{timeout:8000});
 assert((await page.locator('#miHistoryRows tr:has([data-mi-edit="manual:'+defaultChain.id+'"])').innerText()).includes('3/5 Correct'));
 // V25 IEP Chain is exactly T,T,T,T,T, without distractors.
 await page.locator('#miTrialType').selectOption('chain');
 await page.locator('#miChain').selectOption('T,T,T,T,T');
 await page.locator('#miTarget').selectOption('2');
 assert.equal(await page.locator('#miChainPreview .mi-chain-step.target').count(),5);
 assert.equal(await page.locator('#miChainPreview .mi-chain-step.distractor').count(),0);
 for(let i=0;i<5;i++)await page.locator('[data-chain-step="'+i+'"][data-chain-response="'+(i<2?'independent':'incorrect')+'"]').click();
 assert((await page.locator('#miChainSummary').innerText()).includes('2/5 Correct · 40%'));
 await page.locator('#miSave').click();
 await page.waitForFunction(()=>window.db.compass_manual_trial_entries.filter(x=>x.chain_steps?.length===5).length===1,null,{timeout:8000});
 const iepChain=await page.evaluate(()=>window.db.compass_manual_trial_entries.find(x=>x.chain_steps?.length===5));
 assert.equal(iepChain.chain_steps.every(x=>x.trial_type==='T'),true);
 assert((await page.locator('#miHistoryRows tr:has([data-mi-edit="manual:'+iepChain.id+'"])').innerText()).includes('2/5 Correct'));

 assert((await page.evaluate(()=>window.changes))>=3,'create edit delete notifications');
 await page.locator('#miFilterStudent').selectOption('b');
 await page.waitForFunction(()=>document.querySelector('#miProgram')?.value==='assign-b');
 assert.equal(await page.locator('#miFilterStudent').inputValue(),'b');
 assert.equal(await page.locator('#miHistoryRows tr').count(),1,'other student history empty');
 assert.equal(await page.locator('#miHistoryRows').innerText().then(t=>t.includes('Existing manual')),false,'student isolation');
 assert.equal(errors.length,0,errors.join('; '));
 console.log('PASS Manual Input',width,'session grouping','2/5 Correct','40%','behavior pills','student-linked CRUD','provider manual','graph','grouped session archive','student isolation');
 await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
