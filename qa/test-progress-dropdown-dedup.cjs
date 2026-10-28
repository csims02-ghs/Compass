const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const script=fs.readFileSync('progress-profile-live-v1.js','utf8');
const html='<!doctype html><html><head><meta charset="utf-8"></head><body><div id="profile-tab-progress"></div><button id="nav-progress">Progress</button><script>'+script.replaceAll('</script','<\\/script')+'</script></body></html>';
const snapshot={
 studentId:'synthetic-student',studentName:'Synthetic Student',
 programs:[
  {assignment:{id:'old-actions-1',program_id:'def-actions',student_id:'synthetic-student',status:'archived',display_order:1,created_at:'2026-07-01'},definition:{id:'def-actions',program_name:'Actions',program_config:{targets:[{id:'jump',name:'Jump'}],mastery_pct:80}}},
  {assignment:{id:'old-actions-2',program_id:'def-actions',student_id:'synthetic-student',status:'archived',display_order:2,created_at:'2026-08-01'},definition:{id:'def-actions',program_name:'Actions',program_config:{targets:[{id:'jump',name:'Jump'}],mastery_pct:80}}},
  {assignment:{id:'new-actions',program_id:'def-actions',student_id:'synthetic-student',status:'active',display_order:5,created_at:'2026-10-01'},definition:{id:'def-actions',program_name:'Actions',program_config:{targets:[{id:'jump',name:'Jump'},{id:'wave',name:'Wave'}],mastery_pct:90}}},
  {assignment:{id:'old-colors',program_id:'def-colors',student_id:'synthetic-student',status:'archived',display_order:6,created_at:'2026-07-01'},definition:{id:'def-colors',program_name:'Colors',program_config:{targets:[{id:'red',name:'Red'}]}}},
  {assignment:{id:'new-colors',program_id:'def-colors',student_id:'synthetic-student',status:'active',display_order:7,created_at:'2026-10-01'},definition:{id:'def-colors',program_name:'Colors',program_config:{targets:[{id:'blue',name:'Blue'}]}}},
  {assignment:{id:'other',program_id:'def-shapes',student_id:'synthetic-student',status:'active',display_order:8},definition:{id:'def-shapes',program_name:'Shapes',program_config:{targets:[{id:'circle',name:'Circle'}]}}}
 ],
 sessions:[
  {id:'sess-old',student_compass_program_id:'old-actions-1',session_date:'2026-07-15',trials_total:1,targets_correct:1,prompted_correct:0,incorrect:0,no_response:0,total_behaviors:0},
  {id:'sess-new',student_compass_program_id:'new-actions',session_date:'2026-10-15',trials_total:1,targets_correct:0,prompted_correct:0,incorrect:1,no_response:0,total_behaviors:0}
 ],
 trialEvents:[
  {session_id:'sess-old',trial_type:'T',result:'independent_correct',target_key:'jump',target_name:'Jump',occurred_at:'2026-07-15',benchmark_key:'1'},
  {session_id:'sess-new',trial_type:'T',result:'incorrect',target_key:'jump',target_name:'Jump',occurred_at:'2026-10-15',benchmark_key:'1'}
 ],
 goals:[],goalLinks:[]
};
(async()=>{const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const vp of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900}]){
 const page=await browser.newPage({viewport:vp}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.evaluate(data=>{window.__compassProgressSnapshot=data;window.dispatchEvent(new Event('compass-progress-data'))},snapshot);
 await page.locator('#nav-progress').click();
 const opts=await page.locator('#cpr-program option').allTextContents();
 assert.deepEqual(opts,['All Programs','Actions','Colors','Shapes'],'Program Progress should show each distinct program exactly once');
 const values=await page.locator('#cpr-program option').evaluateAll(a=>a.map(x=>x.value));
 assert(values.includes('new-actions')&&!values.includes('old-actions-1')&&!values.includes('old-actions-2'),'Active assignment is canonical selector');
 await page.locator('#cpr-program').selectOption('new-actions');
 assert.equal(await page.locator('#cpr-target option').count(),3,'Targets from all assignments are unioned once');
 const chartText=await page.locator('#cpr-chart').innerText();
 assert(chartText.includes('Jul 2026')&&chartText.includes('Oct 2026'),'Both archived and active session dates should appear in graph');
 const old=await page.evaluate(data=>window.compassAcquisitionDataForProgram('old-actions-1',data),snapshot);
 const current=await page.evaluate(data=>window.compassAcquisitionDataForProgram('new-actions',data),snapshot);
 assert(old.includes('Actions')&&old.includes('7/15/26'),'Archived assignment sheet should keep its own earlier session');
 assert(current.includes('Actions')&&current.includes('10/15/26'),'Current assignment sheet should keep its own session');
 await page.locator('#cpr-program').selectOption('all');
 assert.deepEqual(await page.locator('#cpr-program option').allTextContents(),opts,'All Programs does not reintroduce duplicates');
 assert.equal(errors.length,0,errors.join('; '));
 console.log('PASS Program Progress de-dup',vp.width,'three distinct choices','archived+live graph','assignment-specific history preserved');
 await page.close();
}}finally{await browser.close();await new Promise(ok=>server.close(ok))}})().catch(e=>{console.error(e);process.exit(1)});
