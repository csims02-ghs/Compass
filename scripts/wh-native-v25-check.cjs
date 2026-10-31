'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-WH-CONCEPTS&test=1';
(async()=>{
 const result=await fetch(url);
 assert.equal(result.status,200);
 const html=await result.text();
 assert(html.includes('whGrade'));
 const chrome=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
  const page=await chrome.newPage({viewport:{width:1024,height:768}});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#whGrade option').count(),9);
  await page.locator('#whGrade').selectOption('8');
  assert.equal(await page.locator('#targetSelect option').count(),25);
  await page.locator('#chainSelect').selectOption('T');
  await page.locator('#runBtn').click();
  await page.locator('#runPage.active').waitFor();
  assert((await page.locator('#taskStage').innerText()).includes('GRADE 8'));
  console.log('WH_CONCEPTS_V25_CHECK_PASS');
 }finally{await chrome.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
