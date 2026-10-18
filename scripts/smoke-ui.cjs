const assert=require('node:assert/strict');
const { chromium }=require('playwright');
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
   const valid=before.loginButtons.findIndex(x=>x.rect.x>=0&&x.rect.right<=width&&x.rect.y>=0&&x.rect.y<950);
   assert(valid>=0,'At least one sign-in button must be inside the viewport');
   await page.locator('[data-show-login]').nth(valid).click({timeout:6000});
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
   console.log('UI_SMOKE_PASS '+JSON.stringify({width,metrics,errors:errors.slice(0,3)}));
   await page.screenshot({path:'compass-smoke-'+width+'.png',fullPage:false});
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('UI_SMOKE_FAIL',err.stack||err);process.exit(1)});
