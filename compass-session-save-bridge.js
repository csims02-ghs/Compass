/* COMPASS V25 authenticated parent-side session save bridge.
 * The staff token stays in Program Hub; the student runner only gets an
 * assignment-scoped save function, never a bearer token or service key.
 */
(function(root){
 'use strict';
 const results=new Set(['independent_correct','incorrect','prompted','no_response']);
 const types=new Set(['T','D']);
 function tally(events){
  const counted=(events||[]).filter(x=>x.trial_type==='T');
  return {
   independent_correct:counted.filter(x=>x.result==='independent_correct').length,
   incorrect:counted.filter(x=>x.result==='incorrect').length,
   prompted_correct:counted.filter(x=>x.result==='prompted').length,
   no_response:counted.filter(x=>x.result==='no_response').length
  };
 }
 function accuracy(events){
  const t=(events||[]).filter(x=>x.trial_type==='T'&&x.result!=='no_response');
  return t.length?Math.round(100*t.filter(x=>x.result==='independent_correct').length/t.length):null;
 }
 function validate(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||Number(payload.program_version)!==25)
   throw Error('Only a completed V25 program may use this student save bridge.');
  if(typeof payload.submission_key!=='string'||!/^V25:run-[a-zA-Z0-9-]{5,100}$/.test(payload.submission_key))
   throw Error('Missing valid run identifier; no save attempted.');
  const events=payload.trial_events;
  if(!Array.isArray(events)||!events.length||events.length>50)
   throw Error('All recorded teaching steps (1–50) are required before cloud saving.');
  if(events.length>50||JSON.stringify(payload).length>100000)
   throw Error('Session payload exceeds safety limits.');
  const seen=new Set();
  for(let i=0;i<events.length;i++){
   const e=events[i];
   if(!e||e.trial_number!==i+1||!types.has(e.trial_type)||!results.has(e.result)||
     !String(e.target_name||'').trim()||seen.has(e.trial_number))
    throw Error('A trial step is missing its correct program, result, target, or sequence.');
   seen.add(e.trial_number);
  }
  const computed=tally(events),reported=payload.counts||{};
  for(const k of Object.keys(computed))
   if(Number(reported[k]||0)!==computed[k])
    throw Error('Trial scoring does not agree with the session totals ('+k+').');
  return {computed,percentage:accuracy(events)};
 }
 function bind({frame,assignment,isCurrent,getSession,staffId,endpoint,onSaved,onError}){
  if(!frame||!assignment||typeof getSession!=='function'||typeof isCurrent!=='function'
      ||typeof endpoint!=='string'||!endpoint.startsWith('https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-student-program-runtime?'))
   return false;
  let child;
  try{child=frame.contentWindow;}catch(_){return false;}
  if(!child||!child.__COMPASS_STUDENT_RUNTIME__?.context||
      String(child.__COMPASS_STUDENT_RUNTIME__.context.assignment_id)!==String(assignment.id))return false;
  const runtime=child.__COMPASS_STUDENT_RUNTIME__;
  const pending=new Map();
  async function saveSession(payload){
   if(!isCurrent()||frame.contentWindow!==child||String(runtime.context.assignment_id)!==String(assignment.id))
    throw Error('Student program changed. Reopen the original program before saving.');
   validate(payload);
   // Verify each trial is tied to its assigned COMPASS target, not a local
   // image index or an unrelated student's target key.
   const catalog=runtime.context.targets;
   if(!Array.isArray(catalog)||!catalog.length)
    throw Error('Assigned COMPASS targets are unavailable; the trial was not sent.');
   const norm=x=>String(x||'').trim().toLocaleLowerCase('en-US');
   const byName=new Map(catalog.map(t=>[norm(t.target_name),String(t.target_key||'')]));
   const sessionKey=byName.get(norm(payload.target_name));
   if(!sessionKey||String(payload.target_key||'')!==sessionKey)
    throw Error('Session target key does not match this student program.');
   for(const event of payload.trial_events){
    const expected=byName.get(norm(event.target_name));
    if(!expected||String(event.target_key||'')!==expected)
     throw Error('Recorded trial target does not match an assigned COMPASS target.');
   }
   const key=payload.submission_key;
   if(pending.has(key))return pending.get(key);
   const job=(async()=>{
    const out=await getSession();
    const session=out?.data?.session;
    if(out?.error||!session?.access_token||!session?.user||session.user.id!==staffId)
     throw Error('Staff sign-in expired. Reauthenticate before retrying COMPASS save.');
    if(!isCurrent()||frame.contentWindow!==child)
     throw Error('Student program changed during save. Return to its original assignment.');
    const body={...payload,action:'save_session',staff_id:session.user.id};
    const response=await fetch(endpoint,{method:'POST',headers:{
      'Authorization':'Bearer '+session.access_token,
      'Content-Type':'text/plain;charset=UTF-8'
    },body:JSON.stringify(body)});
    let data={};
    try{data=await response.json();}catch(_){throw Error('COMPASS returned an unreadable save response.');}
    if(!response.ok||data?.ok!==true||!data?.session_id)
     throw Error(String(data?.error||'COMPASS did not acknowledge the run.').slice(0,240));
    if(Number(data.saved_trial_events)!==payload.trial_events.length)
     throw Error('The session returned without all trial steps confirmed; retry the same run.');
    if(!isCurrent()||frame.contentWindow!==child)
     throw Error('The run was saved, but the student program changed before confirmation. Check History.');
    if(typeof onSaved==='function')onSaved(data,assignment);
    return data;
   })();
   pending.set(key,job);
   try{return await job;}catch(e){if(typeof onError==='function')onError(e,assignment);throw e}
   finally{pending.delete(key)}
  }
  runtime.saveSession=saveSession;
  runtime.verifiedParentSaveBridge=true;
  return true;
 }
 const api={tally,accuracy,validate,bind};
 root.COMPASS_SESSION_SAVE_BRIDGE=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
