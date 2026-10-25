#!/usr/bin/env node
// Independent printer-friendly COMPASS report stress test; no student data or login required.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const code=fs.readFileSync(path.resolve(__dirname,'../student-profile-print.js'),'utf8');
assert.match(html,/printProfileBtn'\)\.addEventListener\('click',async/,'Native Print Profile must use portrait report handler');
assert.match(html,/student-profile-print\.js\?v=20261025-portrait/,'Published HTML must load print module');
assert.doesNotMatch(html,/\$\('printProfileBtn'\)\.addEventListener\('click',\(\)=>window\.print\(\)\)/,'Legacy full-app printing should be removed');
assert.equal((code.match(/Technology & Transition Readiness/g)||[]).length>0,true);

function fixture(){
 const names=[
  '1:1 Count','AAC Navigation','Working Memory','Using Individualized Regulation Tools',
  'Emotion Identification','Handwashing & Hygiene','Gross Motor Imitation','Functional Keyboard & Touchscreen Access'
 ];
 const programs=names.map((name,i)=>({assignment:{id:'a'+i,program_id:'def'+i,status:'active'},definition:{program_name:name,program_config:{}}}));
 const sessions=[],trialEvents=[];
 for(let i=0;i<names.length;i++){
  sessions.push({id:'s'+i,student_compass_program_id:'a'+i,session_date:'2026-10-23',trials_total:5,targets_correct:4,prompted_correct:1,total_behaviors:i===3?2:0});
  for(let j=0;j<5;j++)trialEvents.push({session_id:'s'+i,student_compass_program_id:'a'+i,trial_type:'T',result:j===4?'prompted':'independent_correct',prompt_level:j===4?'verbal':null});
 }
 return {student:{id:'student-1',student_code:'0004',display_label:'Sample Profile Student',grade_level:'3',selected_behaviors:['noncompliance','work refusal']},
 school:'Elementary School',classroom:'Transition Resource Room',primaryService:'Special Education',
 goals:[{status:'active',current_percent:64,target_percent:80,review_date:'2026-10-29'}],
 programs,sessions,trialEvents,masteredCount:7,
 weeks:4,now:'2026-10-25T15:00:00-04:00',printedDate:'2026-10-25'
 };
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const data=fixture();
  const scenarios=[
   ['populated',data,['Targets Mastered','Prompt %','20%','7','80%','AAC Navigation']],
   ['empty',{...data,goals:[],programs:[],sessions:[],trialEvents:[],masteredCount:null},['Targets Mastered','Prompt %','—']],
   ['long-name',{...data,student:{...data.student,display_label:'Very Long Student Label '.repeat(6)},school:'Dr. Very Long Regional Integrated Elementary and Secondary Educational Campus '.repeat(2),classroom:'Individualized Intensive Transition Learning Resource Classroom '.repeat(2)},['Targets Mastered','20%']],
   ['partial-prompts',{...data,trialEvents:data.trialEvents.filter(e=>e.session_id!=='s0')},['Insufficient verified prompt data']],
   ['unsafe-name',{...data,student:{...data.student,display_label:'<img src=x onerror=alert(1)> & Name'}},['& Name']]
  ];
  for(const [label,input,required] of scenarios.filter(([label])=>!process.env.PRINT_SCENARIO||process.env.PRINT_SCENARIO===label)){
   const page=await browser.newPage({viewport:{width:1100,height:1300}});
   await page.addScriptTag({content:code});
   const report=await page.evaluate(d=>window.CompassStudentPrint.render(d),input);
   const print=await browser.newPage({viewport:{width:1200,height:1250}});
   await print.setContent(report,{waitUntil:'domcontentloaded'});
   if(process.env.PRINT_STAGE==='html'){assert.ok(report.includes('Academic Development'));assert.ok(report.includes('Technology &amp; Transition Readiness')||report.includes('Technology & Transition Readiness'));console.log('PASS html generated');await page.close();await print.close();continue;}
   const out=await print.evaluate(()=>{
     const dom=[...document.querySelectorAll('.domain-row')];
     const sheet=document.querySelector('.sheet');
     return {domains:dom.length,names:dom.map(d=>d.querySelector('.domain-name').textContent),text:document.body.textContent,
       sheetH:sheet.clientHeight,contentH:sheet.scrollHeight,portrait:sheet.offsetWidth<sheet.offsetHeight,
       hasPopupUI:!!document.querySelector('.toolbar button'),imageNodes:document.querySelectorAll('.sheet img').length,
       injection:document.querySelectorAll('img[onerror]').length};
   });
   assert.equal(out.domains,8,label+': print all eight agreed domains');
   assert.equal(new Set(out.names).size,8,label+': unique domains');
   assert.equal(out.portrait,true,label+': portrait layout');
   if(process.env.PRINT_STAGE==='layout'){assert.ok(out.domains===8&&out.portrait);console.log('PASS basic layout',out.contentH,out.sheetH);await page.close();await print.close();continue;}
   assert.ok(out.contentH<=out.sheetH+2,label+': no clipped report content, '+out.contentH+' vs '+out.sheetH);
   assert.equal(out.injection,0,label+': escape unsafe student name');
   assert.equal(out.imageNodes,0,label+': print report should contain no student photos');
   for(const target of required)assert.ok(out.text.includes(target),label+': missing '+target);
   if(process.env.PRINT_STAGE==='content'){console.log('PASS content');await page.close();await print.close();continue;}
   const pdf=path.join(os.tmpdir(),'compass-print-'+label+'.pdf');
   await print.pdf({path:pdf,printBackground:true,preferCSSPageSize:true});
   const pages=Number(execFileSync('python3',['-c','import sys;from pypdf import PdfReader;print(len(PdfReader(sys.argv[1]).pages))',pdf],{encoding:'utf8'}).trim());
   assert.equal(pages,1,label+': exactly one US Letter portrait page');
   fs.unlinkSync(pdf);
   console.log('PASS',label,'8 domains, 1 page, no clipping');
   await page.close();await print.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
