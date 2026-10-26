const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const { chromium }=require('playwright');
const compassSource=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
assert.equal(compassSource.split("sb.rpc('assign_compass_programs_without_duplicates'").length-1,2,
  'Bulk and individual assignment must both use duplicate-safe Supabase RPC');
assert.equal(compassSource.includes("sb.from('student_compass_programs').insert("),false,
  'COMPASS must not directly insert student-program assignments without conflict protection');
console.log('COMPASS_DUPLICATE_SAFE_ASSIGNMENT_SMOKE_PASS');

const srcSection=(begin,end)=>{
 const a=compassSource.indexOf(begin),b=compassSource.indexOf(end,a+begin.length);
 assert(a>=0&&b>a,'Missing professional workflow boundary '+begin);
 return compassSource.slice(a,b);
};
assert(compassSource.includes('id="compassRoleFocus"'),'Role Home panel missing');
assert(compassSource.includes('id="iepEvidenceReviewPanel"'),'SPED evidence panel missing');
assert(compassSource.includes('id="clinicalReadinessPanel"'),'BCBA clinical review panel missing');
assert(compassSource.includes('id="clinicalReopenBtn"'),'BCBA legacy review action missing');
assert(compassSource.includes("state.assessmentType==='fba'?'in_progress'"),
 'FBA sections must not automatically clinically finalize at 100%');
assert(compassSource.includes('compass-role-workflows.css?v=20261025-2'),'Unified support stylesheet missing');
assert(compassSource.includes("function compassCanReviewFBA(){return state.profile?.role==='bcba'}"),
 'Clinical sign-off must require BCBA role in client workflow');
const fbaSection=srcSection('  function compassClinicalChecks(record){','  function renderClinicalReadiness(){');
const checkFBA=new Function('assessmentData','ASSESSMENT_TYPES','compassFbaCore',
  fbaSection+';return compassClinicalChecks;')(
  r=>r?.assessment_data||{}, {fba:{sections:[
    'Student & Evaluation Information','Background Information','Observational Behavior Data',
    'Behavior Analysis (ABC)','Functional Hypothesis','Functional Behavior Pathways','Recommendations'
  ]}}, ['Observational Behavior Data','Behavior Analysis (ABC)','Functional Hypothesis','Recommendations']);
const fieldNames=[
    'Student & Evaluation Information','Background Information','Observational Behavior Data',
    'Behavior Analysis (ABC)','Functional Hypothesis','Functional Behavior Pathways','Recommendations'
];
const readyRecord={assessment_data:{sections:Object.fromEntries(fieldNames.map(n=>[n,{percent:100}])),
 notes:Object.fromEntries(fieldNames.map(n=>[n,'Clinician-reviewed source information included.']))}};
assert.equal(checkFBA(readyRecord).length,0,'Fully documented FBA should reach review readiness');
const missingRecord=structuredClone(readyRecord);
missingRecord.assessment_data.notes['Functional Hypothesis']='';
assert(checkFBA(missingRecord).some(x=>x.includes('Functional Hypothesis')),
 'Clinical checklist must catch missing function-hypothesis evidence');
missingRecord.assessment_data.sections['Observational Behavior Data'].percent=85;
assert(checkFBA(missingRecord).some(x=>x.includes('Observational Behavior Data')),
 'A partially documented observation section must fail the review checklist');
const goalSection=srcSection('  function compassGoalEvidence(goal){','  function renderIEPEvidenceReview(){');
const goalEvidence=new Function('state','linkedIds',goalSection+';return compassGoalEvidence;')({
 sessions:[
 {student_compass_program_id:'assignment1',selected_goal_id:'goal1',session_date:'2026-10-20'},
 {student_compass_program_id:'assignment1',selected_goal_id:'different-goal',session_date:'2026-10-20'}],
 trialEvents:[
 {student_compass_program_id:'assignment1',goal_id:'goal1',trial_type:'T',result:'independent_correct',occurred_at:'2026-10-20T10:00:00Z'},
 {student_compass_program_id:'assignment1',goal_id:'goal1',trial_type:'T',result:'prompted',occurred_at:'2026-10-20T10:02:00Z'},
 {student_compass_program_id:'assignment1',goal_id:'goal1',trial_type:'P',result:'independent_correct',occurred_at:'2026-10-20T10:05:00Z'},
 {student_compass_program_id:'assignment1',goal_id:'different-goal',trial_type:'T',result:'independent_correct',occurred_at:'2026-10-20T10:07:00Z'}]
},id=>id==='goal1'?['assignment1']:[])({id:'goal1',title:'Example target'});
assert.equal(goalEvidence.programs,1);
assert.equal(goalEvidence.sessions,1,'Do not attribute a different goal session');
assert.equal(goalEvidence.trials,2,'Exclude probes and different-goal trials from IEP evidence');
assert.equal(goalEvidence.independent,50,'Independent accuracy must count correct / scored teaching trials');
console.log('COMPASS_ROLE_CLINICAL_AND_IEP_EVIDENCE_LOGIC_PASS');

assert(!compassSource.includes('id="compassRoleViewSwitch"'),'Legacy SPED / BCBA role toggle must be removed');
assert(!compassSource.includes('data-role-view='),'Legacy role switch handlers must be removed');
assert(compassSource.includes('Student Support &amp; Progress'),'Shared workspace title must be visible');
assert.equal((compassSource.match(/data-role-filter="(?:all|iep|assessment)"/g)||[]).length,3,
 'One combined queue must have three filters, not separate role views');
assert(compassSource.includes('id="compassRoleQueueCount"'),'Priorities need a visible total count');
const sharedSection=srcSection('  let compassRoleFilter=', '  function renderRoleFocus(){');
const makeQueue=new Function('todayISO','localISO','fmtDate','assessmentStatus','assessmentData','assessmentProgress','assessmentDueDate','studentLabel','studentById','roleName',sharedSection+';return compassUnifiedRoleItems;');
const dstr=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString('en-CA').split('/').join('-')};
const reviewDate=(delta)=>{const d=new Date();d.setDate(d.getDate()+delta);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const testToday=reviewDate(0),testDate=future=>reviewDate(future);
const queue=makeQueue(()=>testToday,d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),d=>d,
 a=>a.status,a=>a.assessment_data||{},a=>a.progress||0,a=>a.due_date||null,
 s=>s?.display_label||'Student',id=>({display_label:id==='s1'?'Student One':'Student Two'}),x=>x);
const result=queue([
 {id:'g-overdue',student_id:'s1',title:'Overdue Goal',status:'active',review_date:testDate(-2),baseline_percent:35,target_percent:80},
 {id:'g-baseline',student_id:'s1',title:'Missing Baseline',status:'active',review_date:null,baseline_percent:null,target_percent:80},
 {id:'g-normal',student_id:'s2',title:'Normal Goal',status:'active',review_date:testDate(100),baseline_percent:25,target_percent:80}
],[
 {id:'fba-1',student_id:'s2',assessment_type:'fba',status:'in_progress',progress:35,assessment_data:{}},
 {id:'fba-legacy',student_id:'s1',assessment_type:'fba',status:'completed',assessment_data:{}},
 {id:'fba-signed',student_id:'s1',assessment_type:'fba',status:'completed',assessment_data:{clinical_review:{reviewer_id:'bcba-id'}}}
]);
assert.equal(result.length,4,'Unified queue should include two flagged goals and two unresolved FBAs');
assert.equal(result[0].key,'goal:g-overdue','Overdue review must have highest priority');
assert(result.some(x=>x.key==='assessment:fba-1'),'BCBA FBA items must appear alongside SPED IEP items');
assert(result.some(x=>x.key==='assessment:fba-legacy'),'Historical FBA without sign-off needs review');
assert(!result.some(x=>x.key==='assessment:fba-signed'),'BCBA-signed completed FBA is not an outstanding action');
assert(!result.some(x=>x.key==='goal:g-normal'),'Healthy goal should not produce a priority item');
assert.equal(new Set(result.map(x=>x.key)).size,result.length,'Same goal or assessment must appear only once');
console.log('COMPASS_UNIFIED_SPED_BCBA_QUEUE_PASS');


(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [1440,1920]){
   const page=await browser.newPage({viewport:{width,height:950}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('http://127.0.0.1:8099/',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForTimeout(2200);
   const landing=page.locator('#landingScreen'),login=page.locator('#loginScreen'),app=page.locator('#app');
   assert.equal(await landing.isVisible(),true,'Landing must be visible for signed-out visitors');
   assert.equal(await login.isVisible(),false,'Login should not be forced open');
   assert.equal(await app.isVisible(),false,'App must not be shown before authentication');
   assert.equal(await page.locator('style#review-only').count(),0,'No review-only CSS allowed');
   assert.equal(await page.locator('#loginForm').count(),1,'Login form exists');
   const before=await page.evaluate(()=>{
     const box=e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),right:Math.round(r.right)}};
     return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
       html:box(document.documentElement),body:box(document.body),bodyStyle:{display:getComputedStyle(document.body).display,position:getComputedStyle(document.body).position,width:getComputedStyle(document.body).width,justify:getComputedStyle(document.body).justifyContent},landing:box(document.querySelector('#landingScreen')),landingStyle:{display:getComputedStyle(document.querySelector('#landingScreen')).display,width:getComputedStyle(document.querySelector('#landingScreen')).width,position:getComputedStyle(document.querySelector('#landingScreen')).position},public:box(document.querySelector('.public-site')),
       app:box(document.querySelector('#app')),loginButtons:[...document.querySelectorAll('[data-show-login]')].map(el=>({text:el.textContent.trim(),rect:box(el)}))};
   });
   console.log('UI_BEFORE_LOGIN '+JSON.stringify(before));
   console.log('UI_ERRORS_BEFORE_LOGIN '+JSON.stringify(errors));
   console.log('UI_AUTH_INITIAL '+JSON.stringify({landing:await landing.isVisible(),login:await login.isVisible(),app:await app.isVisible()}));
   const valid=before.loginButtons.findIndex(x=>x.rect.x>=0&&x.rect.right<=width&&x.rect.y>=0&&x.rect.y<950);
   assert(valid>=0,'At least one sign-in button must be inside the viewport');
   await page.locator('[data-show-login]').nth(valid).click({timeout:6000});
   console.log('UI_ERRORS_AFTER_CLICK '+JSON.stringify(errors));console.log('UI_VIS_AFTER_CLICK '+JSON.stringify({landing:await landing.isVisible(),login:await login.isVisible(),app:await app.isVisible()}));
   await page.waitForTimeout(200);
   assert.equal(await login.isVisible(),true,'Sign-in button must display login form');
   assert.equal(await landing.isVisible(),false,'Public landing must hide on sign-in');
   assert.equal(await app.isVisible(),false,'App must remain hidden before authentication');
   await page.locator('#loginEmail').fill('test@example.invalid');
   await page.locator('#loginPassword').fill('example-only-no-submit');
   assert.equal(await page.locator('#loginEmail').inputValue(),'test@example.invalid');
   // Pure layout test: reveal app in DOM without creating a real authentication session.
   const metrics=await page.evaluate(()=>{
     document.querySelector('#landingScreen').classList.add('hidden');
     document.querySelector('#loginScreen').classList.add('hidden');
     document.querySelector('#app').classList.remove('hidden');
     const home=document.querySelector('#page-home');
     home.classList.add('active');home.hidden=false;home.style.display='block';
     const sidebar=document.querySelector('#sidebar');
     const main=document.querySelector('.main');
     const content=home.querySelector('.content');
     const bounds=e=>{const b=e.getBoundingClientRect();return{x:Math.round(b.x),width:Math.round(b.width),right:Math.round(b.right)}};
     return{innerWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
       sidebar:bounds(sidebar),main:bounds(main),home:bounds(home),content:bounds(content)};
   });
   assert(metrics.sidebar.x===0,'Sidebar should align to left edge');
   assert(metrics.main.x>=200&&metrics.main.x<450,'Main content should start immediately after sidebar');
   assert(metrics.content.x>=metrics.main.x&&metrics.content.x<metrics.main.x+100,
     'Home content should not be shifted or hidden far to the right');
   assert(metrics.home.right<=width+8,'Home section should fit inside viewport');

   // COMPASS Home command center: no duplicate roster, actionable controls and valid layouts.
   const homeAudit=await page.evaluate(()=>{
     const root=document.querySelector('#page-home'),metricCards=[...root.querySelectorAll('.v4-kpi')],quick=[...root.querySelectorAll('[data-home-quick]')];
     const perf=[...root.querySelectorAll('.v4-perf-card')],cal=root.querySelector('#homeCalendarGrid');
     const rect=el=>{const r=el.getBoundingClientRect();return {width:Math.round(r.width),height:Math.round(r.height),right:Math.round(r.right),top:Math.round(r.top)}};
     return {
       homeCards:metricCards.map(x=>x.querySelector('.v4-kpi-label')?.textContent.trim()),
       actions:quick.map(x=>x.dataset.homeQuick),perfCount:perf.length,
       duplicateRoster:!!root.querySelector('#homeCaseloadBody,.home-caseload-table'),
       day:!!root.querySelector('#todaySchedule'),week:!!root.querySelector('#weekSchedule'),
       calendar:!!cal,calendarBounds:rect(cal),range:!!root.querySelector('#homeMetricRange'),
       date:!!root.querySelector('#homeCurrentDate'),resume:!!root.querySelector('#homeRecentWork'),
       deadlines:!!root.querySelector('#homeDeadlineDonut'),
       search:!!root.querySelector('#homeGlobalSearch'),headerAction:!!root.querySelector('#quickRunBtn'),
       styleLoaded:getComputedStyle(metricCards[0]).display==='flex',
       root:rect(root),viewport:innerWidth,
       topGridCols:getComputedStyle(root.querySelector('.v4-top-grid')).gridTemplateColumns.split(' ').filter(Boolean).length
     };
   });
   assert.deepEqual(homeAudit.homeCards,['ACTIVE STUDENTS','NEEDS ATTENTION','UPCOMING REVIEWS','ASSESSMENTS IN PROGRESS']);
   assert.deepEqual(homeAudit.actions,['run','assessment','notes','data']);
   assert.equal(homeAudit.perfCount,4,'All four instructional metric cards must be shown');
   assert.equal(homeAudit.duplicateRoster,false,'Home must not repeat the My Caseload student roster');
   assert(homeAudit.day&&homeAudit.week&&homeAudit.calendar&&homeAudit.range&&homeAudit.resume&&homeAudit.deadlines,'Home command-center panels must exist');
   assert(homeAudit.search&&homeAudit.headerAction&&homeAudit.date,'Header search, session action, and local date must exist');
   assert(homeAudit.styleLoaded,'Dedicated Home CSS must load');
   assert(homeAudit.calendarBounds.width>180,'The live mini calendar must have usable width');
   assert(homeAudit.topGridCols===2,'Wide desktop Home should show calendar and week panel side by side');
   assert(homeAudit.root.right<=width+10,'Home must not extend off the right edge');
   console.log('COMPASS_HOME_V4_SMOKE_PASS '+JSON.stringify({width,homeAudit}));


   const combinedAudit=await page.evaluate(()=>{
     const root=document.querySelector('#compassRoleFocus');
     const filters=[...root.querySelectorAll('[data-role-filter]')].map(b=>b.dataset.roleFilter);
     const title=root.querySelector('#compassRoleFocusTitle')?.textContent.trim();
     const noRoleSwitch=!root.querySelector('#compassRoleViewSwitch');
     const hasQueue=!!root.querySelector('#compassRoleItems')&&!!root.querySelector('#compassRoleQueueCount');
     const showMore=!!root.querySelector('#compassRoleShowMore');
     const rbtRunnerAvailable=!!document.querySelector('#runStudentProgramsBtn');
     return{title,filters,noRoleSwitch,hasQueue,showMore,rbtRunnerAvailable};
   });
   assert.equal(combinedAudit.title,'Student Support & Progress');
   assert.deepEqual(combinedAudit.filters,['all','iep','assessment']);
   assert(combinedAudit.noRoleSwitch&&combinedAudit.hasQueue&&combinedAudit.showMore,
     'Unified Student Support should replace the old role tabs and expose one queue');
   assert(combinedAudit.rbtRunnerAvailable,'Existing instructional runner entry point must remain present');
   console.log('COMPASS_UNIFIED_ROLE_DOM_PASS '+JSON.stringify({width,combinedAudit}));

   const caseloadAudit=await page.evaluate(()=>{
     const home=document.getElementById('page-home'),view=document.getElementById('page-caseload');
     home.classList.remove('active');home.hidden=true;home.style.display='none';
     view.classList.add('active');view.hidden=false;view.style.display='block';
     const cards=[...view.querySelectorAll('.compass-caseload-metrics > article')];
     const rect=e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),width:Math.round(r.width),right:Math.round(r.right),top:Math.round(r.top)}};
     const result={
       headings:cards.map(c=>c.querySelector('span')?.textContent.trim()),
       cardBounds:cards.map(rect),main:rect(view),search:rect(view.querySelector('#caseloadSearch')),
       add:rect(view.querySelector('.caseload-action-row button')),
       addActions:view.querySelectorAll('[data-action="open-caseload-add"]').length,
       tableActionHeader:view.querySelector('table th:last-child')?.textContent.trim(),
       oldCards:[...view.querySelectorAll('#caseServices,#caseSessionsToday,#caseAttention')].length,
       styleIds:document.querySelectorAll('#compass-caseload-dashboard-20261025').length,
       headerLabels:[...view.querySelectorAll('.compass-caseload-table th')].map(th=>th.textContent.trim()),
       hasProgramsFilter:!!view.querySelector('#caseProgramFilter'),
       sidebarWidth:rect(document.getElementById('sidebar')).width,
       progressHeaderWidths:[...view.querySelectorAll('.compass-caseload-table th')].slice(3,5).map(th=>rect(th).width),
       actionHeaderWidth:rect(view.querySelector('.compass-caseload-table th:last-child')).width,
       profileButton:(()=>{
         const tbody=view.querySelector('#caseloadBody');
         const fixture=document.createElement('tr');
         fixture.innerHTML='<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td><button type="button" class="btn small case-profile-button">Profile</button></td>';
         tbody.appendChild(fixture);
         const b=fixture.querySelector('button'),style=getComputedStyle(b),r=b.getBoundingClientRect();
         const result={width:Math.round(r.width),height:Math.round(r.height),whiteSpace:style.whiteSpace,scrollWidth:b.scrollWidth,clientWidth:b.clientWidth};
         fixture.remove();return result;
       })()
     };
     view.classList.remove('active');view.hidden=true;view.style.display='none';
     home.classList.add('active');home.hidden=false;home.style.display='block';
     return result;
   });
   assert.deepEqual(caseloadAudit.headings,['Assigned Students','Upcoming Reviews','Assessments in Progress','Active Student Plans'],'Canonical caseload cards absent in browser');
   assert.equal(caseloadAudit.addActions,1,'Duplicate Add Student actions');
   assert.equal(caseloadAudit.oldCards,0,'Old summary cards are still mounted');
   assert.equal(caseloadAudit.styleIds,1,'Duplicate or missing caseload CSS');
   assert.equal(caseloadAudit.hasProgramsFilter,false,'Programs filter must not appear on My Caseload');
   assert(Math.abs(caseloadAudit.sidebarWidth-248)<=2,'Desktop sidebar should be slightly narrower at 248px');
   assert(caseloadAudit.progressHeaderWidths.every(w=>w>0),'Prompt and mastery headers must remain visible');
   assert(caseloadAudit.actionHeaderWidth>caseloadAudit.progressHeaderWidths[0]*0.55,'Profile action column must have enough width');
   assert.equal(caseloadAudit.profileButton.whiteSpace,'nowrap','Profile must stay on one line');
   assert(caseloadAudit.profileButton.scrollWidth<=caseloadAudit.profileButton.clientWidth+1,'Profile label must not be clipped');
   assert(caseloadAudit.profileButton.height<=38,'Profile button should be a compact single-line action');

   assert.deepEqual(caseloadAudit.headerLabels,['Student ↕','School ↕','Grade ↕','Prompt % ↕','Targets Mastered ↕','Status ↕','Next Review ↕','Action'],'My Caseload headers must omit Programs while preserving progress');

   assert(caseloadAudit.add.top>caseloadAudit.search.top,'Add Student must render below Search');
   assert(caseloadAudit.cardBounds.every(c=>c.x>=metrics.main.x-3&&c.right<=width+4),'Caseload metrics overflow the sidebar or viewport');
   assert(caseloadAudit.cardBounds.every(c=>Math.abs(c.top-caseloadAudit.cardBounds[0].top)<=2),'All four caseload summary cards must fit on one desktop row');
   assert(caseloadAudit.cardBounds.every(c=>c.width>=185),'Caseload cards must remain readable at desktop widths');
   if(width===1440){
     await page.setViewportSize({width:1280,height:950});
     const fit1280=await page.evaluate(()=>{
       const home=document.querySelector('#page-home'),view=document.querySelector('#page-caseload');
       home.classList.remove('active');home.hidden=true;home.style.display='none';
       view.classList.add('active');view.hidden=false;view.style.display='block';
       const cards=[...view.querySelectorAll('.compass-caseload-metrics > article')].map(el=>{
         const r=el.getBoundingClientRect();
         const label=el.querySelector('span'),t=label.getBoundingClientRect();
         return {top:Math.round(r.top),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),labelFits:label.scrollWidth<=label.clientWidth+1,within: t.right<=r.right+1};
       });
       view.classList.remove('active');view.hidden=true;view.style.display='none';
       home.classList.add('active');home.hidden=false;home.style.display='block';
       return cards;
     });
     assert.equal(fit1280.length,4,'Caseload must retain four cards at 1280px');
     assert(fit1280.every(c=>Math.abs(c.top-fit1280[0].top)<=2&&c.right<=1284&&c.labelFits&&c.within),'At 1280px, all four cards must form one row without clipped labels: '+JSON.stringify(fit1280));
     console.log('CASELOAD_FOUR_CARD_1280_PASS '+JSON.stringify(fit1280));
     await page.setViewportSize({width,height:950});
   }

   console.log('CASELOAD_BROWSER_LAYOUT_PASS '+JSON.stringify({width,caseloadAudit}));

   const nav=await page.evaluate(()=>{
     const sidebar=document.querySelector('#sidebar'),scroll=document.querySelector('#compassSidebarScroll');
     const toggle=document.querySelector('#compassAdditionalToggle'),additional=document.querySelector('#compassAdditionalNav');
     if(!sidebar||!scroll||!toggle||!additional)return {exists:false};
     const measure=()=>{const sr=sidebar.getBoundingClientRect(),tr=toggle.getBoundingClientRect();
       return {sidebarTop:sr.top,sidebarBottom:sr.bottom,toggleTop:tr.top,toggleBottom:tr.bottom}};
     const collapsed=additional.hidden;
     const initial=measure();
     toggle.click();
     const expanded=!additional.hidden;
     const items=[...additional.querySelectorAll('[data-page]')].map(x=>x.dataset.page);
     const mainScroll=getComputedStyle(scroll).overflowY,sidebarScroll=getComputedStyle(sidebar).overflowY;
     const nestedScroll=getComputedStyle(additional).overflowY;
     scroll.scrollTop=scroll.scrollHeight;
     const after=measure();
     toggle.click();
     return {exists:true,collapsed,expanded,items,initial,after,mainScroll,sidebarScroll,nestedScroll,
       nestedConstrained:additional.scrollHeight>additional.clientHeight+3,
       ownerOnlyAdminButton:!!sidebar.querySelector('#compassAdminNav'),
       compactFont:parseFloat(getComputedStyle(sidebar.querySelector('.brand-title')).fontSize),
       scrollHeight:scroll.scrollHeight,scrollClientHeight:scroll.clientHeight,
       toggleExpandedAfterClose:toggle.getAttribute('aria-expanded')};
   });
   assert(nav.exists&&nav.collapsed&&nav.expanded,'Pinned Additional Tools must expand from a collapsed state');
   assert.equal(nav.mainScroll,'auto','The entire navigation must share one scrolling area');
   assert.equal(nav.sidebarScroll,'hidden','The sidebar itself must not create a second scrollbar');
   assert.equal(nav.nestedConstrained,false,'Additional Tools must not have its own scrollbar');
   assert(nav.items.includes('offline-programs')&&nav.items.includes('sessions')&&nav.items.includes('settings'),
     'Offline lists, Session Notes and Settings must be in Additional Tools');
   assert.equal(nav.ownerOnlyAdminButton,false,'Administration cannot be shown without owner authentication');
   assert(nav.initial.toggleTop>=0&&nav.initial.toggleBottom<=950,'Additional Tools must initially be visible within the viewport');
   assert(Math.abs(nav.initial.toggleTop-nav.after.toggleTop)<2,'Additional Tools must stay pinned while menu scrolls');
   assert.equal(nav.toggleExpandedAfterClose,'false','Additional Tools must collapse');
   assert(nav.compactFont<=32,'COMPASS sidebar title must use compact typography');
   console.log('SIDEBAR_PINNED_SMOKE_PASS '+JSON.stringify({width,nav}));
   // Verify the compact main menu fits without its own visible scrollbar at desktop heights,
   // and that the two requested links are absent rather than deleting their underlying pages.
   for(const compactHeight of [768,831,870]){
     await page.setViewportSize({width,height:compactHeight});
     const compact=await page.evaluate(()=>{
       const scroll=document.querySelector('#compassSidebarScroll');
       const additional=document.querySelector('#compassAdditionalNav');
       const instruction=scroll.querySelector('[aria-label="Instruction"]');
       return {
         height:innerHeight,scrollHeight:scroll.scrollHeight,clientHeight:scroll.clientHeight,
         additionalHidden:additional.hidden,
         instructionLinks:[...instruction.querySelectorAll('[data-page]')].map(n=>n.dataset.page),
         dataCollectionPageExists:!!document.querySelector('#page-data-collection'),
         dataProgressPageExists:!!document.querySelector('#page-progress'),
         dockVisible:document.querySelector('#compassAdditionalToggle').getBoundingClientRect().bottom<=innerHeight
       };
     });
     assert(compact.scrollHeight<=compact.clientHeight+1,
       'Collapsed sidebar should fit without vertical scrollbar at height '+compactHeight+': '+JSON.stringify(compact));
     assert(compact.additionalHidden&&compact.dockVisible,'Pinned tools must remain collapsed and visible');
     assert.deepEqual(compact.instructionLinks,['programs','assessments'],
       'Instruction menu must omit Data Collection and Data & Progress links');
     assert(compact.dataCollectionPageExists&&compact.dataProgressPageExists,
       'Removing navigation must not delete the associated COMPASS modules');
     console.log('COMPACT_SIDEBAR_FIT_PASS '+JSON.stringify({width,compact}));
   }
   await page.setViewportSize({width,height:950});


   // Native Progress remains reachable within Graphs, with no extra top-level navigation button.
   assert.equal(await page.locator('#progressChart,#progressProgramFilter,#studentSessionsBody').count(),0,
     'Legacy Progress DOM must not be shipped');
   assert.equal(await page.locator('#profile-tab-progress').count(),1,'Native Progress tab must exist');
   await page.waitForFunction(()=>!!window.__compassProgressUIv1,{timeout:10000});
   const progressCheck=await page.evaluate(()=>{
     const profile=document.querySelector('#page-student-profile'),home=document.querySelector('#page-home');
     home.classList.remove('active');home.hidden=true;home.style.display='none';
     profile.classList.add('active');profile.hidden=false;profile.style.display='block';
     window.__compassProgressSnapshot={
       studentId:'local-demo-only',
       programs:[{assignment:{id:'demo-assignment',program_id:'demo-program',goal_percentage:80,display_order:1},
         definition:{program_name:'Test Reading Program',program_config:{targets:[{id:'demo-target',name:'Reading Task'}]}}}],
       sessions:[{id:'demo-session',student_compass_program_id:'demo-assignment',
         target_key:'demo-target',target_name:'Reading Task',
         trials_total:5,targets_correct:4,prompted_correct:0,incorrect:1,no_response:0,
         session_date:'2026-10-18',total_behaviors:0,source_record:{}}],
       goals:[],goalLinks:[],trialEvents:[]
     };
     window.dispatchEvent(new Event('compass-progress-data'));
     const profileNav=document.querySelector('#profileTabs');
     const visibleTabs=Array.from(profileNav.querySelectorAll(':scope > button'));
     const topFive=visibleTabs.slice(0,5).map(b=>b.getAttribute('aria-label'));
     const actualOrder=visibleTabs.map(b=>b.getAttribute('aria-label'));
     const navStyle=getComputedStyle(profileNav);
     const columns=navStyle.gridTemplateColumns.trim().split(/\s+/).length;
     const rows=navStyle.gridTemplateRows.trim().split(/\s+/).length;
     if(visibleTabs.length!==10)throw Error('Expected exactly ten student profile tabs; found '+visibleTabs.length);
     if(!document.querySelector('#compassGraphsChartsTab'))throw Error('Graphs tab missing');
     // Exercise the new tenth navigation button without forging an authenticated student session.
     const progressButton=profileNav.querySelector('[data-tab="progress"]');
     if(!progressButton)throw Error('Progress navigation button missing');
     progressButton.click();
     const panel=document.querySelector('#profile-tab-progress');
     const native=document.querySelector('#cpr-liveView');
     return{newView:!!native, visible:!!native&&!!native.getBoundingClientRect().height,
       nativeInTab:panel.contains(native),oldGraph:!!document.querySelector('#progressChart'),
       controlCount:panel.querySelectorAll('#cpr-program,#cpr-target,#cpr-benchmark,#cpr-period').length,
       svgCount:panel.querySelectorAll('svg').length,tabActive:panel.classList.contains('active'),
       navCount:visibleTabs.length,topFive,actualOrder,columns,rows};
   });
   assert(progressCheck.newView&&progressCheck.visible&&progressCheck.nativeInTab,
     'The redesigned Progress view must render immediately inside the native tab');
   assert.equal(progressCheck.oldGraph,false,'Old graph cannot appear');
   assert.equal(progressCheck.controlCount,4,'All four progress filters should display');
   assert(progressCheck.tabActive,'Native Progress tab must be activated by the new navigation button');
   assert.equal(progressCheck.navCount,10,'Two rows of five must have exactly ten tabs');
   assert.deepEqual(progressCheck.topFive,['Overview','IEP Services','Programs','Graphs','Notes & Documents']);
   assert.deepEqual(progressCheck.actualOrder,['Overview','IEP Services','Programs','Graphs','Notes & Documents','Goals','Assessments','Behavior','Team','Progress']);
   assert.equal(progressCheck.columns,5,'The student profile must use five navigation columns');
   assert.equal(progressCheck.rows,2,'The student profile must use two navigation rows');
   assert.equal(errors.length,0,'No browser JavaScript errors permitted');
   console.log('PROGRESS_SMOKE_PASS '+JSON.stringify({width,progressCheck}));
   console.log('UI_SMOKE_PASS '+JSON.stringify({width,metrics,errors:errors.slice(0,3)}));
   await page.screenshot({path:'compass-smoke-'+width+'.png',fullPage:false});
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('UI_SMOKE_FAIL',err.stack||err);process.exit(1)});
