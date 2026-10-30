'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8099/',{waitUntil:'domcontentloaded'});
    const outcome=await page.evaluate(async()=>{
      const check=(v,m)=>{if(!v)throw new Error(m)};
      const root=document.getElementById('page-student-profile');
      const select=document.getElementById('quickStudentSwitch');
      const crumb=root?.querySelector('.breadcrumb');
      const hero=root?.querySelector('.compass-premium-grid');
      check(root&&select&&crumb&&hero,'Missing profile header or quick student dropdown');
      check(select.getAttribute('aria-label')?.includes('caseload'),'Accessible caseload selector label missing');
      const main=[...document.querySelectorAll('script:not([src])')].map(x=>x.textContent||'')
        .find(x=>x.includes('function renderCaseloadStudentSwitch()'));
      check(main,'Main COMPASS functions unavailable');
      const renderSource=main.slice(main.indexOf('  function renderCaseloadStudentSwitch()'),
        main.indexOf('  // Keep the previous student',main.indexOf('  function renderCaseloadStudentSwitch()')));
      const students=[
        {id:'student-b',display_label:'Zoe',student_code:'B2'},
        {id:'student-a',display_label:'Amelia',student_code:'A1'},
        {id:'student-c',display_label:'Amelia',student_code:'C3'}
      ];
      const state={currentStudent:students[0],caseloadStudents:students,programLists:[],programListItems:[]};
      const requests=[],notices=[];
      const switchApp=new Function('state','$','studentLabel','toast','openStudent',
        renderSource+';return {renderCaseloadStudentSwitch,switchCaseloadStudent}')(
        state,id=>document.getElementById(id),s=>s?.display_label||'Student',m=>notices.push(m),id=>requests.push(id));
      switchApp.renderCaseloadStudentSwitch();
      check(select.value==='student-b','Current student not selected');
      check([...select.options].slice(1).map(o=>o.value).join(',')==='student-a,student-c,student-b','Caseload must sort by name and stable ID');
      check([...select.options].every(o=>!o.textContent.includes('Secret Student')),'Unexpected student leak');
      switchApp.switchCaseloadStudent('unassigned');
      check(requests.length===0&&notices.length===1,'Outside-caseload navigation was not rejected');
      switchApp.switchCaseloadStudent('student-a');
      check(requests.join(',')==='student-a','Expected student navigation not dispatched');
      switchApp.switchCaseloadStudent('student-b');
      check(requests.join(',')==='student-a','Current student must not be unnecessarily reloaded');
      state.caseloadStudents=[];
      switchApp.renderCaseloadStudentSwitch();
      check(select.disabled&&select.options.length===1,'Empty caseload not handled');
      state.caseloadStudents=students;
      state.currentStudent={id:'directory-student',display_label:'Directory Student'};
      switchApp.renderCaseloadStudentSwitch();
      check(select.value===''&&select.options[0].textContent.includes('outside your caseload'),'Directory student placeholder incorrect');
      check(!select.disabled,'Must allow switching back to an assigned student');
      state.currentStudent=students[0];
      switchApp.renderCaseloadStudentSwitch();
      // Exercise the real openStudent transition with two overlapping requests.
      const source=main.slice(main.indexOf('  async function openStudent(id){'),
        main.indexOf('  let studentProfileLoadSeq=0;',main.indexOf('  async function openStudent(id){')));
      const deferred=[];
      const profileApp=new Function('state','studentById','$','showPage','loadStudentProfile','renderCaseloadStudentSwitch','toast',
        source+';return {openStudent}')(
        state,id=>students.find(s=>s.id===id),id=>document.getElementById(id),
        ()=>{},()=>new Promise((resolve,reject)=>deferred.push({resolve,reject})),
        switchApp.renderCaseloadStudentSwitch,()=>{});
      const pA=profileApp.openStudent('student-a'),pB=profileApp.openStudent('student-b');
      check(state.currentStudent.id==='student-b'&&select.value==='student-b','Switch did not update selected student');
      check(root.classList.contains('compass-profile-loading'),'Stale student content must be masked');
      check(deferred.length===2,'Rapid selections were not independently started');
      const list=document.getElementById('studentProgramLists');
      check(!list.children.length,'Prior student list cards were not cleared');
      const spinner=document.getElementById('compassProfileLoading');
      check(spinner&&!spinner.hidden,'Loading indicator missing');
      deferred[1].resolve();await pB;
      check(!root.classList.contains('compass-profile-loading'),'Latest student should be revealed');
      deferred[0].resolve();await pA;
      check(state.currentStudent.id==='student-b'&&!root.classList.contains('compass-profile-loading'),
        'Late response from previous student must not take over profile');
      // Restore the profile to a visible state for responsive positioning tests.
      document.querySelector('.app')?.classList.remove('hidden');
      document.getElementById('landingScreen')?.classList.add('hidden');
      document.getElementById('loginScreen')?.classList.add('hidden');
      root.classList.add('active');root.style.display='block';root.hidden=false;
      return {entries:students.length,rapidSwitch:true,sourceGuard:
        main.includes('if(seq!==studentProfileLoadSeq||state.currentStudent?.id!==sid)return')&&
        main.includes('await loadTeam(sid)')&&
        main.includes('if(state.currentStudent?.id!==expectedStudentId)return')&&
        main.includes('if(state.currentStudent?.id!==expectedStudentId)return;'),
        selectorId:select.id};
    });
    assert.equal(outcome.sourceGuard,true,'Missing guard against stale student data');
    const layout=[];
    for(const width of [1440,1024,768,390]){
      await page.setViewportSize({width,height:850});
      const r=await page.evaluate(()=>{
        const root=document.getElementById('page-student-profile');
        const crumb=root.querySelector('.breadcrumb').getBoundingClientRect();
        const switcher=root.querySelector('.compass-quick-student-switch').getBoundingClientRect();
        const select=root.querySelector('#quickStudentSwitch').getBoundingClientRect();
        const hero=root.querySelector('.compass-premium-grid').getBoundingClientRect();
        const cs=getComputedStyle(document.getElementById('quickStudentSwitch'));
        return{crumbTop:crumb.top,switchTop:switcher.top,switchBottom:switcher.bottom,
          heroTop:hero.top,selectWidth:select.width,overflow:document.documentElement.scrollWidth>innerWidth+4,
          selectVisible:select.width>100&&cs.display!=='none',pointer:getComputedStyle(root.querySelector('.compass-quick-student-switch')).visibility};
      });
      assert(r.selectVisible,'Dropdown hidden at '+width);
      assert(r.switchTop>=r.crumbTop-3,'Dropdown overlaps breadcrumb at '+width);
      assert(r.heroTop>=r.switchBottom-2,'Dropdown overlaps hero at '+width);
      assert(!r.overflow,'Horizontal page overflow at '+width);
      layout.push({width,selectWidth:r.selectWidth});
    }
    assert.equal(errors.length,0,'Uncaught page errors: '+errors.join(' | '));
    console.log('COMPASS_QUICK_STUDENT_SWITCH_PASS',JSON.stringify({caseload:outcome.entries,rapid:outcome.rapidSwitch,viewportTests:layout}));
  }finally{await browser.close()}
})().catch(e=>{console.error('COMPASS_QUICK_STUDENT_SWITCH_FAIL',e);process.exitCode=1});
