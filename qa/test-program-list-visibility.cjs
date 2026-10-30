'use strict';
// COMPASS program visibility regression; no user or student data.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>!/\bsrc\s*=/.test(m[1]));
for(const [i,m] of scripts.entries())new vm.Script(m[2],{filename:'compass-inline-'+i});
const main=scripts.map(x=>x[2]).find(x=>x.includes('async function fetchProgramCatalog()'));
assert(main,'Catalog loader missing');
const start=main.indexOf('  let programCatalogRefreshPromise=null;'),end=main.indexOf('  function schoolForStudent(s)',start);
assert(start>=0&&end>start,'Catalog retry function boundary missing');
const source=main.slice(start,end);
const create=(responses,initial=[])=>{
 const state={user:{id:'synthetic'},offlineMode:false,programCatalog:initial,programCatalogLoadFailed:false};
 const status={textContent:''};let i=0,renders=0;
 const sb={from(name){assert.equal(name,'compass_programming_programs');return{
  select(){return this},eq(){return this},order(){return Promise.resolve(responses[Math.min(i++,responses.length-1)])}
 }}};
 const api=new Function('state','sb','$','renderProgramLibrary',source+';return {fetchProgramCatalog,reloadProgramCatalog};')(
  state,sb,()=>status,()=>{renders++});
 return{state,status,api,requests:()=>i,renders:()=>renders};
};
(async()=>{
 const catalog=Array.from({length:155},(_,i)=>({id:i,program_name:'Synthetic Program '+i}));
 const transient=create([{error:{message:'Temporary network error'}},{data:catalog}]);
 assert.equal((await transient.api.fetchProgramCatalog()).length,155);
 assert.equal(transient.requests(),2);
 assert.equal(transient.state.programCatalogLoadFailed,false);
 const failing=create([{error:{message:'Failed to fetch'}}],[{id:'existing'}]);
 await failing.api.reloadProgramCatalog();
 assert.equal(failing.requests(),2);
 assert.equal(failing.state.programCatalog.length,1,'Do not erase previously loaded programs');
 assert.equal(failing.state.programCatalogLoadFailed,true);
 assert.equal(failing.renders(),1);
 const recovered=create([{data:catalog}],[]);
 await recovered.api.reloadProgramCatalog();
 assert.equal(recovered.state.programCatalog.length,155);
 assert.equal(recovered.renders(),1);
 assert(main.includes('state.studentProgramsLoadError=!!programRes?.error'),'Failed student assignment request not detected');
 assert(main.includes('id="retryAssignedPrograms"'),'Missing assigned program retry');
 assert(main.includes('id="reloadProgramCatalog"'),'Missing library retry');
 assert(main.includes("if(name==='programs'&&!state.offlineMode&&state.user&&!state.programCatalog.length)void reloadProgramCatalog()"),'Missing re-fetch on library navigation');
 const profile=main.slice(main.indexOf('async function loadStudentProfile()'),main.indexOf('async function loadTeam()',main.indexOf('async function loadStudentProfile()')));
 const unmask=profile.indexOf("profilePage.classList.remove('compass-profile-loading')");
 const auxiliary=profile.indexOf('Promise.allSettled([loadCalendar(),loadProgramLists()])');
 assert(unmask>0&&auxiliary>unmask,'Do not hide programs behind calendar and list fetches');
 const handler=main.slice(main.indexOf('async function openStudent(id)'),main.indexOf('let studentProfileLoadSeq=0'));
 assert(handler.includes("showPage('students')"),'Failed student fetch must return safely to directory');
 console.log('COMPASS_PROGRAM_LIST_VISIBILITY_PASS');
})().catch(e=>{console.error('COMPASS_PROGRAM_LIST_VISIBILITY_FAIL',e);process.exitCode=1});
