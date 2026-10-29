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
      await page.waitForTimeout(250);
      const positions=async()=>await page.evaluate(()=>{
        const rect=id=>{const el=document.getElementById(id),r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
        const h=document.querySelector('#page-home .v4-header').getBoundingClientRect();
        return {
          toolbar:rect('workspaceTopToolbar'),
          toggle:rect('workspaceFullscreenToggle'),
          homeHeader:{top:h.top,bottom:h.bottom},
          quickRun:rect('quickRunBtn'),
          main:document.querySelector('#app > .main').getBoundingClientRect().top,
        };
      });
      let p=await positions();
      assert(p.toolbar.height>=58,`Missing reserved toolbar height at width ${width}`);
      assert(p.homeHeader.top>=p.toolbar.bottom-1,`Home overlaps toolbar at width ${width}: ${JSON.stringify(p)}`);
      assert(p.toggle.bottom<=p.homeHeader.top+1,`Full Screen covers home controls at width ${width}: ${JSON.stringify(p)}`);
      const b=await page.locator('#workspaceFullscreenToggle');
      await b.click();
      assert.equal(await page.locator('#app').evaluate(e=>e.classList.contains('compass-focus-mode')),true,
        `Focus mode did not enable at width ${width}`);
      assert.equal(await page.locator('#sidebar').evaluate(e=>getComputedStyle(e).display),'none',
        `Sidebar did not hide at width ${width}`);
      p=await positions();
      assert(p.homeHeader.top>=p.toolbar.bottom-1,`Focused Home overlaps toolbar at width ${width}: ${JSON.stringify(p)}`);
      assert(p.toggle.bottom<=p.homeHeader.top+1,`Focused toggle covers Home controls at width ${width}: ${JSON.stringify(p)}`);
      await b.click();
      assert.equal(await page.locator('#app').evaluate(e=>e.classList.contains('compass-focus-mode')),false,
        `Focus mode did not restore at width ${width}`);
      await page.close();
      console.log('COMPASS_FULLSCREEN_LAYOUT_PASS',width);
    }
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
