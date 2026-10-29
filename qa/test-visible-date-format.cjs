const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="app"><p id="date">Recorded 2026-10-26</p><table><tr><td id="dateCell">2026-10-29</td></tr></table><input id="stored" type="date" value="2026-10-26"><span id="time">2026-10-26T13:27:00Z</span></div></body></html>');
  await page.addScriptTag({content:fs.readFileSync('compass-date-display.js','utf8')});
  assert.equal(await page.locator('#date').innerText(),'Recorded 10/26/2026');
  assert.equal(await page.locator('#dateCell').innerText(),'10/29/2026');
  assert.equal(await page.locator('#stored').inputValue(),'2026-10-26','Native date input retains ISO format for database');
  assert.equal(await page.locator('#time').innerText(),'2026-10-26T13:27:00Z','Timestamp values are not mangled');
  assert.equal(await page.locator('#dateCell').evaluate(e=>e.classList.contains('compass-date-nowrap')),true);
  await page.evaluate(()=>{const p=document.createElement('p');p.id='dynamic';p.textContent='Due 2026-12-01';document.getElementById('app').appendChild(p)});
  await page.waitForFunction(()=>document.getElementById('dynamic').textContent==='Due 12/01/2026');
  await page.evaluate(()=>document.getElementById('dynamic').textContent='Rescheduled 2026-12-08');
  await page.waitForFunction(()=>document.getElementById('dynamic').textContent==='Rescheduled 12/08/2026');
  console.log('COMPASS_DATE_DISPLAY_PASS');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
