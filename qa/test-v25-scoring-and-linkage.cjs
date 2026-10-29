const assert=require('node:assert/strict');
const bridge=require('../compass-session-save-bridge.js');
const endpoint='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-student-program-runtime?assignment_id=a&token=placeholder';
const assignment={id:'assignment-a'};
const staffId='staff-1';
const targets=[{target_name:'Cow',target_key:'animal-cow'},{target_name:'Dog',target_key:'animal-dog'}];
const ev=(number,result,target='Cow',type='T')=>({trial_number:number,trial_type:type,result,target_name:target,target_key:target==='Cow'?'animal-cow':'animal-dog'});
const make=(events)=>({program_version:25,submission_key:'V25:run-1699999999999-33',target_name:'Cow',target_key:'animal-cow',
 counts:bridge.tally(events),trial_events:events,behavior_counts:{Tantrums:2}});
const choices=['independent_correct','independent_correct','independent_correct','independent_correct','incorrect'];
const five=choices.map((r,i)=>ev(i+1,r));
assert.equal(bridge.accuracy(five),80,'Four correct + one incorrect must be 80%');
assert.equal(bridge.accuracy([ev(1,'independent_correct'),ev(2,'incorrect'),ev(3,'prompted')]),33,'Prompted targets are not independently correct');
assert.equal(bridge.accuracy([ev(1,'no_response')]),null,'No valid opportunities must not display 0%');
assert.equal(bridge.accuracy([...five,ev(6,'independent_correct','Dog','D')]),80,'Distractors excluded from target accuracy');
assert.deepEqual(bridge.tally(five),{independent_correct:4,incorrect:1,prompted_correct:0,no_response:0});
assert.deepEqual(bridge.tally([ev(1,'independent_correct'),ev(2,'prompted'),ev(3,'no_response'),ev(4,'incorrect')]),
 {independent_correct:1,incorrect:1,prompted_correct:1,no_response:1});
assert.throws(()=>bridge.validate({...make(five),counts:{independent_correct:3,incorrect:2}}),/does not agree/);
assert.throws(()=>bridge.validate({...make(five),trial_events:five.slice(1)}),/sequence/);
assert.throws(()=>bridge.validate({...make(five),program_version:24}),/V25/);
assert.throws(()=>bridge.validate({...make(five),trial_events:[]}),/required/);
assert.throws(()=>bridge.validate({...make(five),trial_events:[...five,ev(6,'forged')]}),/sequence|step/);
assert.equal(bridge.validate(make(five)).percentage,80);

async function run(){
 const child={__COMPASS_STUDENT_RUNTIME__:{context:{assignment_id:assignment.id,targets}}};
 const frame={contentWindow:child};
 let current=true, calls=[], authenticated=true, mode='success';
 const getSession=async()=>authenticated?{data:{session:{user:{id:staffId},access_token:'mock-token'}}}:{data:{session:null}};
 global.fetch=async(url,options)=>{
  calls.push({url,options});
  if(mode==='network-error')throw Error('Network disconnected');
  if(mode==='http-error')return {ok:false,status:422,json:async()=>({ok:false,error:'Assigned target mismatch'})};
  if(mode==='mismatched-ack')return {ok:true,json:async()=>({ok:true,session_id:'session-a',saved_trial_events:4})};
  return {ok:true,json:async()=>({ok:true,session_id:'session-a',saved_trial_events:5})};
 };
 const confirmed=[];
 assert.equal(bridge.bind({frame,assignment,isCurrent:()=>current,getSession,staffId,endpoint,
  onSaved:(ack)=>confirmed.push(ack.session_id)}),true);
 assert.equal(child.__COMPASS_STUDENT_RUNTIME__.verifiedParentSaveBridge,true);
 const save=child.__COMPASS_STUDENT_RUNTIME__.saveSession;
 const [a,b]=await Promise.all([save(make(five)),save(make(five))]);
 assert.equal(a.session_id,'session-a');
 assert.equal(b.session_id,'session-a');
 assert.equal(calls.length,1,'Concurrent retry must not duplicate network writes');
 assert.equal(confirmed.length,1);
 assert.equal(calls[0].options.headers.Authorization,'Bearer mock-token');
 assert.equal(JSON.parse(calls[0].options.body).staff_id,staffId);
 assert.equal(JSON.parse(calls[0].options.body).trial_events.length,5);
 assert.equal(JSON.parse(calls[0].options.body).action,'save_session');
 assert.equal(JSON.stringify(child).includes('mock-token'),false,'No token disclosed to student iframe');

 let before=calls.length;
 await assert.rejects(()=>save({...make(five),target_key:'unrelated-target'}),/Session target key/);
 await assert.rejects(()=>save({...make(five),trial_events:[...five.slice(0,4),{...five[4],target_key:'1'}]}),/Recorded trial target/);
 assert.equal(calls.length,before,'Bad mappings must be blocked before database request');
 authenticated=false;
 await assert.rejects(()=>save(make(five)),/sign-in expired/);
 assert.equal(calls.length,before,'Unauthenticated save must not reach backend');
 authenticated=true;
 mode='http-error';
 await assert.rejects(()=>save(make(five)),/Assigned target mismatch/);
 mode='mismatched-ack';
 await assert.rejects(()=>save(make(five)),/without all trial steps confirmed/);
 mode='success';
 assert.equal((await save(make(five))).session_id,'session-a','Retry after failed save must succeed with same key');
 current=false;before=calls.length;
 await assert.rejects(()=>save(make(five)),/Student program changed/);
 assert.equal(calls.length,before,'Wrong student/program must not be saved');
 console.log('COMPASS_V25_SCORING_AND_TRIAL_CONNECTION_PASS');
}
run().catch(e=>{console.error(e);process.exit(1)});
