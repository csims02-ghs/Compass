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
 const messages=[],frameWindow={postMessage:(data,origin)=>messages.push({data,origin})},frame={contentWindow:frameWindow};
 const state={user:signedIn?{id:'staff-A'}:null,currentStudent:{id:'student-A'},
   activeProgramListRun:null,
   studentPrograms:[{id:'assignment-A',student_id:studentId,status:'active'}]};
 const event={source:frameMatches?frameWindow:{},origin:eventOrigin,
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
 const nextStart="if(e.source===$('runnerFrame')?.contentWindow&&e.data?.type==='compass-next-program')";
 const nextEnd="if(e.data?.type==='compass-offline-session-save'";
 const begin=html.indexOf(nextStart),stop=html.indexOf(nextEnd,begin+nextStart.length);
 assert(begin>=0&&stop>begin,'Student Next Program listener must exist');
 const nextBlock=html.slice(begin,stop);
 const nextHandler=new Function('e','
})().catch(err=>{console.error(err);process.exitCode=1;});
,'state','programById','openRunner','advanceProgramList','toast',
  'return (async()=>{'+nextBlock+'})()');
 const opens=[],notices=[];
 const frame={contentWindow:{}};
 const assignedA={id:'assigned-A',student_id:'student-A',program_id:'AAC',status:'active',display_order:1,view_token:'test-a'};
 const assignedB={id:'assigned-B',student_id:'student-A',program_id:'ACTIONS',status:'active',display_order:2,view_token:'test-b'};
 const caseState={currentStudent:{id:'student-A'},profile:{role:'bcba'},activeProgramListRun:null,studentPrograms:[assignedA,assignedB]};
 await nextHandler({source:frame.contentWindow,data:{type:'compass-next-program',assignment_id:'assigned-A'}},
   ()=>frame,caseState,id=>({program_name:id==='ACTIONS'?'Actions':'AAC',program_status:'active'}),
   async (...args)=>opens.push(args),async()=>{},(...args)=>notices.push(args));
 assert.equal(opens.length,1,'Next Program must open next assigned program');
 assert.equal(opens[0][0],'assigned-B','Next Program must retain this student assignment');
 assert.equal(opens[0][1],'test-b');
 caseState.currentStudent.id='different-student';
 await nextHandler({source:frame.contentWindow,data:{type:'compass-next-program',assignment_id:'assigned-A'}},
   ()=>frame,caseState,id=>({program_status:'active'}),
   async (...args)=>opens.push(args),async()=>{},(...args)=>notices.push(args));
 assert.equal(opens.length,1,'Must not navigate to another student assignment');

 console.log('COMPASS_AAC_AUTH_HANDOFF_QA_PASS: legitimate assignment allowed; 6 denial + Next Program paths blocked.');
})().catch(err=>{console.error(err);process.exitCode=1;});
