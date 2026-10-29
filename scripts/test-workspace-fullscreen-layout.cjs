const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const width of [390,540,800,1024,1440,1504,1920]){
      const page=await browser.newPage({viewport:{width,height:832},deviceScaleFactor:1});
      await page.goto('http://127.0.0.1:8099/',{waitUntil:'domcontentloaded',timeout:45000});
      await page.evaluate(()=>{
        document.getElementById('landingScreen')?.classList.add('hidden');
        document.getElementById('loginScreen')?.classList.add('hidden');
        document.getElementById('app')?.classList.remove('hidden');
        document.getElementById('page-home')?.classList.add('active');
        document.body.classList.add('compass-home-active');
      });
      await page.waitForFunction(()=>document.getElementById('workspaceFullscreenToggle')?.dataset.bound==='true');
      const snapshot=()=>page.evaluate(()=>{
        const box=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
        return {
          mainTop:document.querySelector('#app > .main').getBoundingClientRect().top,
          mainLeft:document.querySelector('#app > .main').getBoundingClientRect().left,
          mainPaddingTop:parseFloat(getComputedStyle(document.querySelector('#app > .main')).paddingTop),
          homeHeader:box(document.querySelector('#page-home .v4-header')),
          fullScreen:box(document.querySelector('#workspaceFullscreenToggle')),
          restore:box(document.querySelector('#workspaceShowMenuToggle')),
          showMenuHidden:document.querySelector('#workspaceShowMenuToggle').hidden,
        };
      });
      assert.equal(await page.locator('#workspaceTopToolbar').count(),0,'Old top toolbar must be removed');
      assert.equal(await page.locator('.workspace-sidebar-fullscreen #workspaceFullscreenToggle').count(),1,
        'Full Screen must be inside sidebar, directly under compliance navigation');
      assert.equal(await page.locator('#sidebar .nav[aria-label="Compliance"] + .workspace-sidebar-fullscreen').count(),1,
        'Full Screen belongs directly after Deadlines & Tasks');
      if(width<=850){
        await page.locator('#sidebar').evaluate(e=>e.classList.add('open'));
      }
      // Sidebar should not need the vertical slider at the 832px reference height.
      const menuLayout=await page.locator('#sidebar').evaluate(sidebar=>{
        const scroll=sidebar.querySelector('#compassSidebarScroll');
        const nav=sidebar.querySelector('[aria-label="Compliance"] button[data-page="tasks"]');
        const toggle=sidebar.querySelector('#workspaceFullscreenToggle');
        const a=getComputedStyle(nav),b=getComputedStyle(toggle),r=toggle.getBoundingClientRect();
        return {
          scrollHeight:scroll.scrollHeight,clientHeight:scroll.clientHeight,
          scrollbar:getComputedStyle(scroll).scrollbarWidth,
          toggleBottom:r.bottom,viewportHeight:innerHeight,
          nav:{fontSize:a.fontSize,fontWeight:a.fontWeight,padding:a.padding,minHeight:a.minHeight},
          full:{fontSize:b.fontSize,fontWeight:b.fontWeight,padding:b.padding,minHeight:b.minHeight}
        };
      });
      assert.equal(menuLayout.scrollbar,'none',`Sidebar scrollbar should be removed at ${width}`);
      assert(menuLayout.scrollHeight<=menuLayout.clientHeight+1,
        `Primary sidebar should fit without scrolling at ${width}: ${JSON.stringify(menuLayout)}`);
      assert(menuLayout.toggleBottom<=menuLayout.viewportHeight,
        `Full Screen should be within viewport without scrolling at ${width}: ${JSON.stringify(menuLayout)}`);
      assert.equal(menuLayout.full.fontSize,menuLayout.nav.fontSize,
        `Full Screen must match other menu font sizes at ${width}`);
      assert.equal(menuLayout.full.fontWeight,menuLayout.nav.fontWeight,
        `Full Screen must match other menu font weights at ${width}`);
      assert.equal(menuLayout.full.padding,menuLayout.nav.padding,
        `Full Screen must match other menu padding at ${width}`);
      let p=await snapshot();
      assert.equal(p.mainPaddingTop,0,`Top spacing not restored at width ${width}`);
      assert(p.homeHeader.top<95,`Home page is still pushed down at width ${width}: ${JSON.stringify(p)}`);
      assert(p.showMenuHidden,'Show Menu tab should not display while sidebar is visible');
      assert(await page.locator('#workspaceFullscreenToggle').isVisible(),`Full Screen should be visible in open sidebar at ${width}`);
      await page.locator('#workspaceFullscreenToggle').click();
      assert.equal(await page.locator('#app').evaluate(e=>e.classList.contains('compass-focus-mode')),true,
        `Full Screen failed at ${width}`);
      assert.equal(await page.locator('#sidebar').evaluate(e=>getComputedStyle(e).display),'none',
        `Sidebar should be completely hidden at ${width}`);
      p=await snapshot();
      assert.equal(p.mainPaddingTop,0,'Full Screen must not add a toolbar or top spacer');
      assert(p.homeHeader.top<95,`Focused content was pushed down at ${width}: ${JSON.stringify(p)}`);
      assert.equal(p.showMenuHidden,false,`Show Menu tab unavailable at ${width}`);
      assert(p.mainLeft>=p.restore.right-1,`Show Menu overlaps the page at ${width}: ${JSON.stringify(p)}`);
      assert.equal(await page.locator('#workspaceShowMenuToggle span').innerText(),'Show Menu');
      await page.locator('#workspaceShowMenuToggle').click();
      assert.equal(await page.locator('#app').evaluate(e=>e.classList.contains('compass-focus-mode')),false,
        `Show Menu did not restore normal view at ${width}`);
      assert.equal(await page.locator('#workspaceFullscreenToggle .workspace-fullscreen-label').innerText(),'Full Screen');
      assert.equal(await page.locator('#workspaceShowMenuToggle').isVisible(),false,
        'Restore tab should disappear once sidebar returns');
      if(width<=850){
        assert.equal(await page.locator('#sidebar').evaluate(e=>e.classList.contains('open')),true,
          `Restoring on mobile must reopen its menu at ${width}`);
      }
      // The user's Caseload screen must also return to its original top alignment.
      await page.evaluate(()=>{
        document.querySelector('#page-home').classList.remove('active');
        document.querySelector('#page-caseload').classList.add('active');
      });
      const caseloadTop=()=>page.locator('#page-caseload .page-head').evaluate(e=>e.getBoundingClientRect().top);
      assert((await caseloadTop())<110,`Caseload still has a blank top band at ${width}`);
      if(width<=850)await page.locator('#sidebar').evaluate(e=>e.classList.add('open'));
      await page.locator('#workspaceFullscreenToggle').click();
      assert((await caseloadTop())<110,`Focused Caseload shifted down at ${width}`);
      await page.locator('#workspaceShowMenuToggle').click();
      assert((await caseloadTop())<110,`Restored Caseload shifted down at ${width}`);
      await page.close();
      console.log('COMPASS_SIDEBAR_FULLSCREEN_PASS',width);
    }
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
