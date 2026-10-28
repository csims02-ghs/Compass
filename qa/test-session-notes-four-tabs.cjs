const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const index=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('session-notes-tabs.css','utf8'),js=fs.readFileSync('session-notes-tabs.js','utf8');
const start=index.indexOf('<section id="page-sessions" class="page">'),end=index.indexOf('<section id="page-assessments"',start);
assert(start>0&&end>start,'Session workspace markup must exist on actual site');
const markup=index.slice(start,end);
assert(index.includes('<link rel="stylesheet" href="./session-notes-tabs.css?v=1">'));
assert(index.includes('<script src="./session-notes-tabs.js?v=1" defer></script>'));
assert(index.includes("$('globalQuickRunBtn').addEventListener('click',openQuickRun)"),'Existing Run Program handler preserved');
assert(index.includes('state.globalSessions.map(sessionRow)'),'Session history retains loaded records');
assert(index.includes('state.globalNotes.map(noteRow)'),'Notes history retains loaded records');
const fnStart=index.indexOf('function renderGlobalSessionsNotes(){'),fnEnd=index.indexOf('function renderGlobalProgress(){',fnStart);
assert(fnStart>0&&fnEnd>fnStart);const renderer=index.slice(fnStart,fnEnd);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:650,height:820}]){
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+markup+'<script>'+js+'<'+'/script></body></html>',{waitUntil:'domcontentloaded'});
  const labels=await page.locator('#sessionWorkspaceTabs [role="tab"]').allTextContents();
  assert.deepEqual(labels.map(s=>s.trim()),['Sessions','Notes','History','Manual Input']);
  assert.equal(await page.locator('#sessionWorkspaceTabs [role="tab"]').count(),4);
  assert.equal(await page.locator('#sessionPanelSessions').isVisible(),true);
  assert.equal(await page.locator('#sessionPanelNotes').isVisible(),false);
  assert.equal(await page.locator('#globalQuickRunBtn').count(),1);
  assert.equal(await page.locator('#globalNotes').count(),1);
  assert.equal(await page.locator('#sessionTabSessions').getAttribute('aria-selected'),'true');
  assert((await page.locator('#sessionTabSessions').evaluate(e=>getComputedStyle(e).backgroundColor))!=='rgba(0, 0, 0, 0)','Active tab has selected background');
  await page.locator('#sessionTabNotes').click();
  assert.equal(await page.locator('#sessionPanelNotes').isVisible(),true);
  assert.equal(await page.locator('#sessionPanelSessions').isVisible(),false);
  await page.locator('#sessionTabHistory').click();
  assert.equal(await page.locator('#sessionPanelHistory').isVisible(),true);
  const data={
    globalSessions:[{program_name:'Actions',student_compass_program_id:'assignment1',session_date:'2026-10-01'},{program_name:'Colors',student_compass_program_id:'assignment1',session_date:'2026-10-02'}],
    globalNotes:[{title:'Session note',student_id:'student1',note_date:'2026-10-02',note_type:'session'}]
  };
  await page.evaluate(({renderer,data})=>{
    const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const studentLabel=x=>x?.name||'Unknown',globalStudentForSession=()=>({name:'Synthetic Student'}),fmtDate=v=>v,accuracy=()=>80,roleName=x=>x,studentById=()=>({name:'Synthetic Student'});
    const render=new Function('state','$','esc','studentLabel','globalStudentForSession','fmtDate','accuracy','roleName','studentById',renderer+';return renderGlobalSessionsNotes;')(data,$,esc,studentLabel,globalStudentForSession,fmtDate,accuracy,roleName,studentById);
    render();
  },{renderer,data});
  assert.equal(await page.locator('#globalSessionHistory .stack-item').count(),2);
  assert.equal(await page.locator('#globalNoteHistory .stack-item').count(),1);
  assert.equal(await page.locator('#globalSessionHistoryCount').innerText(),'2 loaded');
  assert.equal(await page.locator('#globalNoteHistoryCount').innerText(),'1 loaded');
  assert.equal(await page.locator('#globalSessions .stack-item').count(),2);
  assert.equal(await page.locator('#globalNotes .stack-item').count(),1);
  await page.locator('#sessionTabManual').click();
  assert.equal(await page.locator('#sessionPanelManual').isVisible(),true);
  assert((await page.locator('#sessionPanelManual').innerText()).includes('Placeholder only'));
  assert.equal(await page.locator('#sessionPanelManual input, #sessionPanelManual textarea, #sessionPanelManual select, #sessionPanelManual button').count(),0,'No functional manual data-entry controls yet');
  assert.equal(await page.locator('#sessionPanelHistory').isVisible(),false);
  await page.locator('#sessionTabManual').focus();
  await page.keyboard.press('Home');assert.equal(await page.locator('#sessionTabSessions').getAttribute('aria-selected'),'true');
  await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#sessionTabNotes').getAttribute('aria-selected'),'true');
  await page.keyboard.press('End');assert.equal(await page.locator('#sessionTabManual').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#sessionPanelSessions').isVisible(),false);
  assert.equal(errors.length,0,errors.join('; '));
  console.log('PASS Session & Notes tabs',viewport.width,'four tabs, accessible keys, retained sessions/notes, history, manual placeholder');
  await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
