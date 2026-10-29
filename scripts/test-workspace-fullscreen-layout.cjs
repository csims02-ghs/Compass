const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const width of [390,540,800,1024,1440,1504,1920]){
      const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
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
      await page.close();
      console.log('COMPASS_SIDEBAR_FULLSCREEN_PASS',width);
    }
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
