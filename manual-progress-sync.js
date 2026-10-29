/* COMPASS Progress: RLS-authorized manual-trial overlay for the currently open student.
   Historical manual trials affect chart counts, but not automatic mastery calculations. */
(function(){
'use strict';
let running=null;
async function fetchManualFor(snapshot){
 const api=window.COMPASS_MANUAL_BRIDGE;
 if(!api||!snapshot?.studentId||snapshot.manualTrialsLoaded||running===snapshot)return;
 running=snapshot;
 const sid=String(snapshot.studentId),found=[];
 try{
  for(let offset=0;offset<100000;offset+=500){
   const response=await api.query('compass_manual_trial_entries')
    .select('id,student_id,student_compass_program_id,event_date,event_time,target_key,target_name,benchmark_key,trial_type,response,behavior_counts,chain_type,deleted_at')
    .eq('student_id',sid).is('deleted_at',null).order('event_date',{ascending:true})
    .range(offset,offset+499);
   if(response.error)throw response.error;
   const records=Array.isArray(response.data)?response.data:[];
   found.push(...records);
   if(records.length<500)break;
   if(offset===99500)throw Error('Manual progress limit reached; narrow the scope to retrieve more than 100,000 entries.');
  }
  if(window.__compassProgressSnapshot!==snapshot)return;
  snapshot.manualTrials=found.filter(x=>x.student_id===sid&&!x.deleted_at);
  snapshot.manualTrialsLoaded=true;
  window.dispatchEvent(new Event('compass-progress-data'));
 }catch(error){
  console.warn('Manual trial overlay could not be loaded for this student. Existing Progress data remains available.',error);
 }finally{
  if(running===snapshot)running=null;
 }
}
window.addEventListener('compass-progress-data',()=>{
 const snapshot=window.__compassProgressSnapshot;
 if(snapshot&&!snapshot.manualTrialsLoaded)fetchManualFor(snapshot);
});
window.addEventListener('compass-manual-record-changed',()=>{
 const snapshot=window.__compassProgressSnapshot;
 if(snapshot){snapshot.manualTrialsLoaded=false;fetchManualFor(snapshot)}
});
if(window.__compassProgressSnapshot)fetchManualFor(window.__compassProgressSnapshot);
})();
