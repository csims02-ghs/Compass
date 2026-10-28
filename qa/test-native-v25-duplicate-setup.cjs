const {chromium}=require('playwright');const http=require('node:http'),assert=require('node:assert/strict');
const codes=["CP-124-AAC-NAVIGATION-AND-COMMUNICATION-ACROSS-PARTNERS","CP-ACTION-IDENTIFICATION","CP-ANIMAL-IDENTIFICATION","CP-BODY-PARTS","CP-CLOTHING-IDENTIFICATION","CP-COLORS","CP-COMMUNITY-IDENTIFICATION","CP-115-CONSTRUCTIVE-PLAY-AND-BUILDING","CP-107-COPYING-SHAPES-AND-VISUAL-MOTOR-INTEGRATION","CP-EMOTION-IDENTIFICATION","CP-127-FINE-MOTOR-IMITATION","CP-FOOD-IDENTIFICATION","CP-DIR-VISUAL-087","CP-126-GROSS-MOTOR-IMITATION","CP-LETTER-FORMATION","CP-LETTER-IDENTIFICATION","CP-LETTER-MATCHING","CP-MATCH-NUMBERS","CP-NUMBER-IDENTIFICATION","CP-NUMBER-TRACING","CP-ONE-STEP-FUNCTIONAL-DIRECTIONS","CP-PUZZLES","CP-QUANTITY","CP-120-REQUESTING-BREAKS","CP-SHAPES","CP-TURN-TAKING-SHARING"];
const base='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?format=html&program_code=';
(async()=>{
const files=new Map();
for(const code of codes){
 const r=await fetch(base+encodeURIComponent(code),{signal:AbortSignal.timeout(25000)});
 assert.equal(r.status,200,'Expected live runner for '+code);
 const s=await r.text();
 assert(s.includes('id="setupPage"'),code+' lost native V25 page');
 assert(s.includes('id="saveSetupBtn"'),code+' lost native save button');
 assert(s.includes('id="benchmarkSelect"'),code+' lost benchmark');
 assert(s.includes('id="targetSelect"'),code+' lost target selector');
 assert(!s.includes('id="compass-v251-live-ui"'),code+' still embeds obsolete V25.1 overlay');
 assert(!s.includes('id="compassV251Tools"'),code+' has duplicate panel HTML');
 files.set(code,s);
 console.log('PASS html',code);
}
const legacy='CP-109-CAUSE-AND-EFFECT-IN-EVERYDAY-SITUATIONS';
const res=await fetch(base+encodeURIComponent(legacy),{signal:AbortSignal.timeout(25000)});assert.equal(res.status,200);
const legacyHtml=await res.text();assert(legacyHtml.includes('id="compass-v251-live-ui"'),'Legacy fallback unexpectedly removed');
console.log('PASS legacy compatibility available');
const server=http.createServer((req,res)=>{let c=decodeURIComponent(req.url.slice(1));res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(files.get(c)||'')});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
for(const code of ['CP-LETTER-IDENTIFICATION','CP-LETTER-MATCHING','CP-NUMBER-IDENTIFICATION','CP-ONE-STEP-FUNCTIONAL-DIRECTIONS','CP-SHAPES','CP-TURN-TAKING-SHARING']){
 const page=await browser.newPage({viewport:{width:1024,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/'+encodeURIComponent(code),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#benchmarkSelect')?.options.length>0,{timeout:10000});
 const n=await page.locator('#benchmarkSelect option').count(),t=await page.locator('#targetSelect option').count();
 assert(n>0&&t>0,code+' native benchmark/target must be populated, got '+n+'/'+t);
 assert.equal(await page.locator('#compassV251Tools').count(),0,code+' duplicate panel');
 assert.equal(await page.locator('#saveSetupBtn').count(),1,code+' native Save Setup count');
 if(code==='CP-LETTER-IDENTIFICATION')assert(t>=5,'Letter Identification expected nonzero targets');
 console.log('PASS browser',code,'benchmarks',n,'targets',t,'errors',errors.length);
 await page.close();
}
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
console.log('PASS all 26 live native V25 runners; legacy injection preserved; no duplicate Save Setup');
})().catch(e=>{console.error(e);process.exit(1)});
