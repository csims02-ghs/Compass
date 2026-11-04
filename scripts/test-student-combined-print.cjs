const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const source=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const shell=source('index.html');
assert.match(shell,/id="printFullStudentReportBtn"[\s\S]*?id="printProfileBtn"/);
assert.match(shell,/student-combined-print-report\.js\?v=/);
const names=['Animal Identification','Body Parts','Clothing','Colors','Community Identification','Constructive Play and Building',
 'Copying Shapes and Visual-Motor Integration','Emotion Identification','Fine Motor Imitation','Food Identification',
 'Gross Motor Imitation','Letter Identification','Letter Matching','Letter Tracing','Match Numbers','Number Identification',
 'Number Tracing','Object Identification','One-Step Functional Directions','Puzzles',
 'Quantity Concepts & Number Sense','Requesting Breaks','Shapes','Turn Taking & Sharing',
 'Greetings & Departures - NET','Show Me a Calm Body'];
const sid='test-student';
const goals=[1,2,6,7,8].map((n,i)=>({id:'goal-'+i,student_id:sid,status:'active',annual_goal_number:n,title:'Goal '+n,target_percent:80,review_date:'2027-05-14'}));
const programs=names.map((name,i)=>({assignment:{id:'a'+i,student_id:sid,display_order:i+1,status:i===20?'hold':'active',instance_config:{}},definition:{program_name:name,program_config:{skill_type:i===25?'Duration tolerance':'Receptive'}}}));
const sessions=programs.map((p,i)=>({id:'s'+i,student_compass_program_id:p.assignment.id,session_date:'2026-11-02',trials_total:5,targets_correct:3,prompted_correct:1,total_behaviors:i%3,behavior_counts:{},source_record:{}}));
const profile={student:{id:sid,display_label:'Test Student',student_code:'0001',grade_level:'1st',selected_behaviors:['A','B','C','D','E']},
 school:'Test School',classroom:'Transition Resource Room',primaryService:'None entered',goals,programs,sessions,trialEvents:[],
 weeks:12,masteredCount:0,now:'2026-11-04T12:00:00-05:00',printedDate:'2026-11-04'};
const identity={name:'Test Student',code:'0001',grade:'1st',school:'Test School',classroom:'Transition Resource Room'};
const programData={studentId:sid,now:'2026-11-04T12:00:00',identity,snapshot:{primaryService:'None entered',behaviorCount:5,lastSession:'11/02/2026',dataReview:'05/14/2027'},
 programs,goals,goalLinks:programs.map((x,i)=>({student_compass_program_id:x.assignment.id,goal_id:goals[i%5].id})),sessions,manualTrials:[],manualReadError:false};
const graphRows=goals.map((g,i)=>({title:g.title,detail:'No directly attributed IEP goal',goal:80,achieved:40+i,rate:.6+i*.05,events:String(100+i*25)}));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
  const p=await browser.newPage();
  for(const n of ['student-profile-print.js','compass-programs-print-report.js','compass-graphs-print-report.js','student-combined-print-report.js'])
   await p.addScriptTag({content:source(n)});
  const html=await p.evaluate(({profile,programData,graphRows,identity})=>{
   const overview=window.CompassStudentPrint.render(profile);
   const programs=window.CompassProgramsPrintReport.render(programData);
   const graphs=window.CompassGraphsPrint.render(graphRows,'iep',identity);
   return window.StudentCombinedPrintReport.printDocument(overview,programs,graphs,'Test Student');
  },{profile,programData,graphRows,identity});
  const output=await browser.newPage();
  await output.setContent(html,{waitUntil:'load'});
  const info=await output.evaluate(()=>({parts:document.querySelectorAll('.report-part').length,
   domains:document.querySelectorAll('.report-overview .domain-row').length,
   programs:document.querySelectorAll('.report-programs tbody tr').length,
   goals:document.querySelectorAll('.report-graphs tbody tr').length,
   graph:document.querySelectorAll('.report-graphs svg').length,
   name:document.body.textContent.includes('Test Student')}));
  assert.deepEqual(info,{parts:3,domains:8,programs:26,goals:5,graph:1,name:true});
  const file=path.join(os.tmpdir(),'student-combined-print-smoke.pdf');
  await output.pdf({path:file,printBackground:true,preferCSSPageSize:true});
  const check="import json,sys;from pypdf import PdfReader;p=PdfReader(sys.argv[1]);print(json.dumps({'count':len(p.pages),'text':[len(x.extract_text() or '') for x in p.pages]}))";
  const pages=JSON.parse(execFileSync('python3',['-c',check,file],{encoding:'utf8'}));
  assert.equal(pages.count,4,'Expected four-page PDF '+JSON.stringify(pages));
  assert.ok(pages.text.every(n=>n>100),'Blank page found');
  fs.unlinkSync(file);
  console.log('PASS printable 4-page combined report: 26 programs, 5 goals, 8 domains');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
