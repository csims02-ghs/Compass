/* COMPASS V25 locked instructional DTI chain standard.
   Applies to each new or upgraded program during implementation and QA.
   Does not mutate existing student data or older active programs. */
(function(root){
 'use strict';
 const steps=Object.freeze(['T','T','T','T','T']);
 const iep=Object.freeze({
   label:'IEP Chain',display:'IEP Chain · T T T T T',
   sequence:'T,T,T,T,T',internalValue:'IEP_TTTTT',
   insertAfter:'Short',steps,
   targetStyle:'Body Parts V25 blue T tiles',
   distractorStyle:'Body Parts V25 amber D tiles',
   runCount:1,requiresStudentSpecificSetup:true,
   preserveMasteryDistinctDates:true,probesSeparate:true
 });
 function resolve(value){
   return [iep.internalValue,iep.sequence,'TTTTT'].includes(String(value))?steps.slice():null;
 }
 function validateOptions(options){
   const a=Array.from(options||[],o=>({
     label:String(o.label||o.text||o.textContent||'').trim(),
     value:String(o.value||'')
   }));
   const short=a.findIndex(o=>/^Short\b/i.test(o.label));
   const i=a.findIndex(o=>/^IEP Chain\b/i.test(o.label));
   const count=a.filter(o=>/^IEP Chain\b/i.test(o.label)).length;
   const correct=!!a[i]&&a[i].label.replace(/[^TD]/g,'').endsWith('TTTTT');
   return Object.freeze({
     compliant:short>=0&&i===short+1&&count===1&&correct&&resolve(a[i].value)!==null,
     afterShort:short>=0&&i===short+1,unique:count===1,
     fiveTargets:correct&&resolve(a[i]?.value)!==null
   });
 }
 root.COMPASS_V25_IEP_CHAIN_RULE=Object.freeze({iep,resolve,validateOptions});
})(typeof window==='object'?window:{});
