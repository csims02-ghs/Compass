#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const shell=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const a=shell.indexOf('  const isDailyProgramListName='),b=shell.indexOf('  function openCreateProgramList(',a);
assert(a>0&&b>a,'Daily Programs implementation not found');
const source=shell.slice(a,b);
const assigned=[
 {id:'p1',student_id:'student-a',program_id:'id1',status:'active',display_order:2},
 {id:'p2',student_id:'student-a',program_id:'id2',status:'active',display_order:1},
 {id:'p3',student_id:'student-a',program_id:'id3',status:'hold',display_order:3},
 {id:'p4',student_id:'student-a',program_id:'id4',status:'archived',display_order:4},
 {id:'p5',student_id:'student-b',program_id:'id5',status:'active',display_order:1}
];
const records=[
 {id:'daily-a',student_id:'student-a',name:'Daily Programs',status:'active'},
 {id:'daily-duplicate-a',student_id:'student-a',name:'daily programs',status:'active'},
 {id:'custom-a',student_id:'student-a',name:'Speech Practice',status:'active'},
 {id:'custom-b',student_id:'student-b',name:'Morning Routine',status:'active'}
];
const rows=[
 {list_id:'daily-a',student_compass_program_id:'p4',display_order:1},
 {list_id:'custom-a',student_compass_program_id:'p1',display_order:2},
 {list_id:'custom-a',student_compass_program_id:'p3',display_order:1}
];
const state={currentStudent:{id:'student-a'},studentPrograms:assigned,programLists:[],programListItems:[],offlineMode:false};
const elements={studentProgramLists:{innerHTML:'',cards:[],appendChild(el){this.cards.push(el)}}};
const downloads=new Map(),packs=new Map(),writes=[];
const sb={from(table){
 let filters=[];return {
 select(){return this},eq(k,v){filters.push(r=>r[k]===v);return this},
 in(k,v){filters.push(r=>v.includes(r[k]));return this},order(){return this},
 then(onSuccess,onError){const items=(table==='student_program_lists'?records:rows).filter(r=>filters.every(p=>p(r)));
 return Promise.resolve({data:items,error:null}).then(onSuccess,onError)}
 };
}};
const context={state,sb,
 safe:async fn=>(await fn()).data,
 $:id=>elements[id],esc:v=>String(v??''),
 programById:id=>({program_name:id}),
 idbGet:async(store,id)=>store==='lists'?downloads.get(id):packs.get(id),
 updateOfflineBadges:async()=>{},
 document:{createElement(){return {className:'',innerHTML:''}}},
 Promise,Set,String,Number,console
};
vm.createContext(context);
vm.runInContext(source+';globalThis.__dailyTest={loadProgramLists,listItems,isListOfflineReady,dailyAssignedProgramRows};',context);
const {loadProgramLists,listItems,isListOfflineReady,dailyAssignedProgramRows}=context.__dailyTest;
(async()=>{
 await loadProgramLists();
 assert.equal(state.programLists.length,2,'One daily card + one custom card expected');
 assert.equal(state.programLists[0].name,'Daily Programs');
 assert.equal(state.programLists[0].id,'daily-a','Existing saved Daily Programs list identity should be preserved');
 assert.deepEqual(Array.from(listItems('daily-a'),x=>x.student_compass_program_id),['p2','p1'],'Daily should mirror active assignments in their order');
 assert.deepEqual(Array.from(listItems('custom-a'),x=>x.student_compass_program_id),['p1'],'Custom list must exclude held/archived programs');
 assert.equal(elements.studentProgramLists.cards.length,2);
 assert(elements.studentProgramLists.cards[0].innerHTML.includes('Manage Assignments'));
 assert(!elements.studentProgramLists.cards[0].innerHTML.includes('data-archive-list'),'Daily should not be separately archived');
 downloads.set('daily-a',{student:{id:'student-a'},items:[
  {student_compass_program_id:'p2'},{student_compass_program_id:'p1'}]});
 packs.set('p2',{ok:true});packs.set('p1',{ok:true});
 assert.equal(await isListOfflineReady('daily-a'),true);
 assigned.find(x=>x.id==='p1').status='archived';
 assert.deepEqual(Array.from(listItems('daily-a'),x=>x.student_compass_program_id),['p2'],'Archived assignment removed automatically');
 assert.equal(await isListOfflineReady('daily-a'),false,'Download must show stale when assignment changes');
 assigned.push({id:'p6',student_id:'student-a',program_id:'id6',status:'active',display_order:0});
 assert.deepEqual(Array.from(listItems('daily-a'),x=>x.student_compass_program_id),['p6','p2'],'Newly assigned program appears automatically in correct order');
 assigned.find(x=>x.id==='p2').status='mastered';
 assert.deepEqual(Array.from(listItems('daily-a'),x=>x.student_compass_program_id),['p6'],'Mastered programs not treated as daily active');
 state.currentStudent={id:'student-b'};
 await loadProgramLists();
 assert.equal(state.programLists.length,2,'Daily placeholder + one custom for second student');
 assert(state.programLists[0].id.startsWith('daily-assigned-student-b'));
 assert.deepEqual(Array.from(listItems(state.programLists[0].id),x=>x.student_compass_program_id),['p5'],'Student isolation');
 assert.equal(writes.length,0,'No DB modifications');
 console.log('DAILY_PROGRAMS_SYNC_PASS '+JSON.stringify({dailyMode:'live assignment mirror',legacyDuplicateHidden:true,heldExcluded:true,archivedExcluded:true,masteredExcluded:true,customPreserved:true,offlineStaleDetected:true,studentIsolated:true}));
})().catch(e=>{console.error('DAILY_PROGRAMS_SYNC_FAIL',e.stack||e);process.exit(1)});
