const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const script=fs.readFileSync('manual-progress-sync.js','utf8');
const progress=fs.readFileSync('progress-profile-live-v1.js','utf8');
assert(progress.includes('const manual=(Array.isArray(snap?.manualTrials)?snap.manualTrials:[])'),'Progress must read authenticated manual records');
assert(progress.includes('!e.maintenance&&!e.probe&&!e.manual'),'Manual trials must not auto-award mastery');
assert(progress.includes('return [...live,...manual]'),'Live and manual events merged');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('about:blank');await page.setContent('<html><body><div id="progress"></div></body></html>');
await page.evaluate(()=>{
 window.records=[{id:'manual-1',student_id:'student-a',student_compass_program_id:'assignment-a',event_date:'2026-10-25',target_key:'1',target_name:'Red',trial_type:'T',response:'independent',behavior_counts:{Elopement:1},deleted_at:null}];
 window.__compassProgressSnapshot={studentId:'student-a',programs:[],sessions:[],trialEvents:[]};
 window.progressEvents=0;
 window.addEventListener('compass-progress-data',()=>window.progressEvents++);
 window.COMPASS_MANUAL_BRIDGE={query(name){
  if(name!=='compass_manual_trial_entries')throw Error('wrong table');
  const f={};return {
   select(){return this},eq(k,v){f[k]=v;return this},is(k,v){f[k]=v;return this},order(){return this},range(){return this},
   then(resolve,reject){return Promise.resolve({error:null,data:window.records.filter(x=>x.student_id===f.student_id&&x.deleted_at==null)}).then(resolve,reject)}
  };
 }};
});
await page.addScriptTag({content:script});
await page.waitForFunction(()=>window.__compassProgressSnapshot.manualTrialsLoaded===true,{timeout:5000});
assert.equal(await page.evaluate(()=>window.__compassProgressSnapshot.manualTrials.length),1);
const before=await page.evaluate(()=>window.progressEvents);
await page.evaluate(()=>{window.records.push({id:'manual-2',student_id:'student-a',student_compass_program_id:'assignment-a',event_date:'2026-10-26',target_key:'2',target_name:'Blue',trial_type:'T',response:'prompted',behavior_counts:{},deleted_at:null});window.dispatchEvent(new Event('compass-manual-record-changed'))});
await page.waitForFunction(()=>window.__compassProgressSnapshot.manualTrials.length===2,{timeout:5000});
assert(await page.evaluate(()=>window.progressEvents)>before);
await page.evaluate(()=>{window.records[0].deleted_at=new Date().toISOString();window.dispatchEvent(new Event('compass-manual-record-changed'))});
await page.waitForFunction(()=>window.__compassProgressSnapshot.manualTrials.length===1,{timeout:5000});
assert.equal(await page.evaluate(()=>window.__compassProgressSnapshot.manualTrials[0].id),'manual-2');
await page.evaluate(()=>{window.__compassProgressSnapshot={studentId:'student-b',programs:[],sessions:[],trialEvents:[]};window.dispatchEvent(new Event('compass-progress-data'))});
await page.waitForFunction(()=>window.__compassProgressSnapshot.manualTrialsLoaded===true,{timeout:5000});
assert.equal(await page.evaluate(()=>window.__compassProgressSnapshot.manualTrials.length),0,'No cross-student manual rows');
assert.equal(errors.length,0,errors.join(';'));
console.log('PASS Progress overlay scoped to selected student, add/edit/delete refresh, live+manual chart linkage and no automatic mastery');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
