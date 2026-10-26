'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start="    if(e.source===$('runnerFrame')?.contentWindow&&e.data?.type==='compass-auth-request')";
const end="    if(e.source===$('runnerFrame')?.contentWindow&&e.data?.type==='compass-program-session-saved')";
const from=html.indexOf(start),to=html.indexOf(end,from+start.length);
assert(from>=0&&to>from,'COMPASS auth handoff must be present in canonical site');
const authBlock=html.slice(from,to);
assert(authBlock.includes("e.origin!==window.location.origin"),'Validate event origin');
assert(authBlock.includes("e.source===$('runnerFrame')?.contentWindow"),'Validate frame source');
assert(authBlock.includes('assigned.student_id'),'Validate selected student and assigned program');
assert(authBlock.includes('session.user?.id!==state.user.id'),'Validate signed-in staff user');
const handler=new Function('e','$','sb','state','window','return (async()=>{'+authBlock+'})()');
async function run({eventOrigin='https://compass.example.com',assignmentId='assignment-A',
 sessionUser='staff-A',signedIn=true,frameMatches=true,studentId='student-A'}={}){
 const messages=[],frame={postMessage:(data,origin)=>messages.push({data,origin})};
 const state={user:signedIn?{id:'staff-A'}:null,currentStudent:{id:'student-A'},
   activeProgramListRun:null,
   studentPrograms:[{id:'assignment-A',student_id:studentId,status:'active'}]};
 const event={source:frameMatches?frame:{},origin:eventOrigin,
   data:{type:'compass-auth-request',nonce:'qa-aac-nonce-123456',assignment_id:assignmentId}};
 const sb={auth:{getSession:async()=>({data:{session:signedIn?{access_token:'synthetic.jwt.token',
   user:{id:sessionUser}}:null},error:null})}};
 await handler(event,selector=>selector==='runnerFrame'?frame:null,sb,state,
   {location:{origin:'https://compass.example.com'}});
 return messages;
}
(async()=>{
 let results=await run();
 assert.equal(results.length,1,'Authorized assigned staff should receive one handoff');
 assert.equal(results[0].origin,'https://compass.example.com');
 assert.equal(results[0].data.type,'compass-auth-response');
 assert.equal(results[0].data.nonce,'qa-aac-nonce-123456');
 for(const [name,options] of Object.entries({
   foreignOrigin:{eventOrigin:'https://untrusted.example.com'},
   otherAssignment:{assignmentId:'assignment-B'},
   wrongStaffSession:{sessionUser:'staff-B'},
   unsigned:{signedIn:false},
   otherFrame:{frameMatches:false},
   notSelectedStudent:{studentId:'student-B'}
 })){
   results=await run(options);
   assert.equal(results.length,0,name+' must not receive staff session');
 }
 console.log('COMPASS_AAC_AUTH_HANDOFF_QA_PASS: legitimate assignment allowed; 6 denial paths blocked.');
})().catch(err=>{console.error(err);process.exitCode=1;});
