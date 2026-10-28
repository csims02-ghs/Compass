const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const index=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('manual-input-workspace.css','utf8'),js=fs.readFileSync('manual-input-workspace.js','utf8');
const start=index.indexOf('<section id="sessionPanelManual"'),end=index.indexOf('\n </section>\n </div></section>',start);
assert(start>=0&&end>start,'Manual Input must replace placeholder on the page');
const html='<!doctype html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body><button id="sessionTabManual">Manual Input</button>'+index.slice(start,end+('\n </section>').length)+'<script>'+js.replaceAll('</script','<\\/script')+'</script></body></html>';
assert(index.includes('manual-input-workspace.css?v=1'));assert(index.includes('manual-input-workspace.js?v=1'));
assert(index.includes('window.COMPASS_MANUAL_BRIDGE='));
assert.equal((index.slice(start,end).match(/id="mi\w+"/g)||[]).length>=35,true);
const sample={
 students:[{id:'s1',display_label:'Reina M.',student_code:'S001',selected_behaviors:['Non-Compliance','Elopement','Aggression (Adult)'],secondary_behaviors:['Property'],status:'active'},{id:'s2',display_label:'Alex M.',student_code:'S002',selected_behaviors:['Climbing'],secondary_behaviors:[],status:'active'}],
 student_compass_programs:[{id:'a0',student_id:'s1',program_id:'p1',status:'archived',assigned_date:'2025-10-01'},{id:'a1',student_id:'s1',program_id:'p1',status:'active',assigned_date:'2026-10-01'},{id:'a2',student_id:'s1',program_id:'p2',status:'active',assigned_date:'2026-10-10'},{id:'a3',student_id:'s2',program_id:'p1',status:'active',assigned_date:'2026-10-01'}],
 compass_programming_programs:[{id:'p1',program_name:'Colors',created_at:'2025-09-01',program_config:{benchmark_sets:[{label:'Basic Colors'}],targets:[{id:'red',name:'Red',metadata:{benchmark:1}},{id:'blue',name:'Blue',metadata:{benchmark:1}}]}},{id:'p2',program_name:'Actions',created_at:'2025-09-02',program_config:{benchmarks:[{name:'Actions 1–10'}],targets:[{id:'jump',name:'Jump'}]}}],
 profiles:[{id:'staff1',full_name:'Charles Sims',role:'rbt',active:true},{id:'staff2',full_name:'Amy Johnson',role:'bcba',active:true}],
 student_iep_goals:[{id:'goal1',student_id:'s1',title:'Identifies colors',created_at:'2026-10-01'}],
 compass_program_sessions:[
 {id:'session1',student_compass_program_id:'a0',staff_id:'staff2',session_date:'2026-10-25',target_name:'Red',target_key:'red',trials_total:2,targets_correct:1,prompted_correct:1,incorrect:0,no_response:0,behavior_counts:{'Non-Compliance':1},notes:'Live session note',started_at:'2026-10-25T09:30:00Z',created_at:'2026-10-25T09:30:00Z'},
 {id:'session2',student_compass_program_id:'a1',staff_id:'staff1',session_date:'2026-10-24',target_name:'Blue',target_key:'blue',trials_total:2,targets_correct:1,prompted_correct:0,incorrect:1,no_response:0,behavior_counts:{Elopement:1},notes:'Historical session summary',started_at:'2026-10-24T10:00:00Z',created_at:'2026-10-24T10:00:00Z'}
 ],
 compass_trial_events:[
 {id:'live1',session_id:'session1',student_compass_program_id:'a0',trial_number:1,trial_type:'T',target_key:'red',target_name:'Red',benchmark_key:'1',goal_id:null,result:'independent_correct',prompt_level:'None',behavior_counts:{'Non-Compliance':1},occurred_at:'2026-10-25T09:31:00Z',source:'live',created_at:'2026-10-25T09:31:00Z'},
 {id:'live2',session_id:'session1',student_compass_program_id:'a0',trial_number:2,trial_type:'T',target_key:'red',target_name:'Red',benchmark_key:'1',result:'prompted_correct',prompt_level:'Gestural',behavior_counts:{},occurred_at:'2026-10-25T09:32:00Z',source:'live',created_at:'2026-10-25T09:32:00Z'}
 ],
 compass_manual_trial_entries:[
 {id:'manual1',student_id:'s1',student_compass_program_id:'a1',created_by:'staff1',provider_name:'Manual: Original',provider_entry_type:'manual',event_date:'2026-10-27',event_time:'09:45',target_name:'Red',target_key:'red',benchmark_key:'1',trial_number:1,trial_type:'T',response:'independent',prompt_level:'None',notes:'Existing manual entry',behavior_counts:{'Aggression (Adult)':1},deleted_at:null}
 ]
};
(async()=>{
 const server=http.createServer((_req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const viewport of [{width:1536,height:1024},{width:1024,height:768},{width:650,height:860}]){
 const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>d.accept());
 await page.addInitScript(data=>{
   const records=JSON.parse(JSON.stringify(data));window.__records=records;window.__writes=[];
   const ctx={userId:'staff1',providerName:'Charles Sims',role:'rbt',currentStudentId:'s1'};
   const make=name=>{
     const c={filters:[],sort:null,range:null,method:'select',payload:null};
     const o={
       select(){return o},
       eq(k,v){c.filters.push(x=>x[k]===v);return o},
       in(k,v){c.filters.push(x=>v.includes(x[k]));return o},
       is(k,v){c.filters.push(x=>x[k]===v);return o},
       order(k,args){c.sort={k,desc:args?.ascending===false};return o},
       range(a,b){c.range=[a,b];return o},
       insert(v){c.method='insert';c.payload=v;return o},
       update(v){c.method='update';c.payload=v;return o},
       then(ok,fail){return Promise.resolve().then(()=>{
         let arr=records[name]||[],rows=arr.filter(x=>c.filters.every(fn=>fn(x)));
         if(c.method==='insert'){const row={...c.payload,id:'added'+(arr.length+1),deleted_at:null};arr.push(row);rows=[row];window.__writes.push({op:'insert',row:{...row}})}
         if(c.method==='update'){rows=rows.map(x=>{Object.assign(x,c.payload);window.__writes.push({op:'update',id:x.id,payload:{...c.payload}});return x})}
         if(c.sort)rows=rows.slice().sort((a,b)=>String(a[c.sort.k]||'').localeCompare(String(b[c.sort.k]||''))*(c.sort.desc?-1:1));
         if(c.range)rows=rows.slice(c.range[0],c.range[1]+1);
         return {data:rows,error:null}
       }).then(ok,fail)}
     };return o;
   };
   window.COMPASS_MANUAL_BRIDGE={context:()=>ctx,query:make,notify:()=>{window.__changed=(window.__changed||0)+1}};
 },sample);
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
 await page.locator('#sessionPanelManual').evaluate(el=>el.hidden=false);
 await page.locator('#sessionTabManual').click();
 await page.waitForFunction(()=>document.getElementById('miStudent')?.options.length>=3,{timeout:8000});
 await page.waitForFunction(()=>document.querySelectorAll('#miHistoryRows tr').length>=4,{timeout:8000});
 assert.equal(await page.locator('#miStudent').inputValue(),'s1');
 assert.equal(await page.locator('#miProgram option').count(),3,'Student has two active assigned programs');
 assert.equal(await page.locator('#miBehaviors input[type=checkbox]').count(),4);
 assert((await page.locator('#miHistoryRows').innerText()).includes('Live session note'),'Archived assignment live history included');
 assert((await page.locator('#miHistoryRows').innerText()).includes('Historical session summary'),'Sessions without trial events included');
 assert((await page.locator('#miHistoryRows').innerText()).includes('Existing manual entry'),'Manual history included');
 assert.equal(await page.locator('#miHistoryRows button[data-mi-edit]').count(),1,'Recorded live data is read-only');
 assert.equal(await page.locator('#miStats .mi-stat').count(),4);
 await page.locator('#miGraphToggle').click();assert.equal(await page.locator('#miGraph svg').count(),1);
 await page.locator('#miProgram').selectOption('a1');
 await page.locator('#miProvider').selectOption('manual');
 assert.equal(await page.locator('#miProviderManual').isVisible(),true);
 await page.locator('#miProviderManual').fill('J. Perez');
 await page.locator('#miBenchmark').selectOption('1');await page.locator('#miTarget').selectOption('red');
 await page.locator('#miTrial').fill('2');await page.locator('#miNotes').fill('Historical handwritten worksheet');
 await page.locator('[data-response="prompted"]').click();await page.locator('#miPrompt').selectOption('Gestural');
 await page.locator('#miBehaviors input[value="Elopement"]').check();
 await page.locator('#miSave').click();
 await page.waitForFunction(()=>window.__writes.some(x=>x.op==='insert'),null,{timeout:6000});
 const added=await page.evaluate(()=>window.__writes.find(x=>x.op==='insert').row);
 assert.equal(added.student_id,'s1');assert.equal(added.student_compass_program_id,'a1');assert.equal(added.provider_name,'J. Perez');assert.equal(added.provider_entry_type,'manual');
 assert.equal(added.response,'prompted');assert.equal(added.behavior_counts.Elopement,1);
 await page.waitForFunction(()=>document.getElementById('miHistoryRows').textContent.includes('J. Perez'),null,{timeout:7000});
 await page.locator('[data-mi-edit="manual:added2"]').click();
 await page.waitForFunction(()=>document.getElementById('miSave').textContent==='Save Changes',{timeout:5000});
 await page.locator('#miNotes').fill('Corrected paper log');
 await page.locator('#miSave').click();await page.waitForFunction(()=>window.__writes.some(x=>x.op==='update'&&x.id==='added2'&&x.payload.notes==='Corrected paper log'),null,{timeout:7000});
 await page.waitForFunction(()=>document.getElementById('miHistoryRows').textContent.includes('Corrected paper log'),null,{timeout:7000});
 await page.locator('[data-mi-delete="manual:added2"]').click();
 await page.waitForFunction(()=>window.__writes.some(x=>x.op==='update'&&x.id==='added2'&&!!x.payload.deleted_at),null,{timeout:7000});
 await page.waitForFunction(()=>!document.getElementById('miHistoryRows').textContent.includes('Corrected paper log'),null,{timeout:7000});
 assert((await page.locator('#miHistoryRows').innerText()).includes('Live session note'),'Delete does not affect live history');
 await page.locator('#miFilterStudent').selectOption('s2');
 await page.waitForFunction(()=>document.getElementById('miStudent').value==='s2',null,{timeout:7000});
 assert.equal(await page.locator('#miBehaviors input').count(),1);
 assert(!(await page.locator('#miHistoryRows').innerText()).includes('Reina M.'),'No cross-student history leak');
 assert.equal(errors.length,0,errors.join('; '));
 console.log('PASS Manual Input',viewport.width+'x'+viewport.height,'student+program FKs','archived+live+manual history','provider typed','behavior','edit+delete audit','graph','student isolation');
 await page.close();
 }}finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error(e);process.exit(1)});
