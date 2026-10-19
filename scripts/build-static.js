#!/usr/bin/env node
// Build COMPASS directly into index.html, removing the browser-side loader chain.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const status={textContent:'',className:''};
function executable(html){
  const all=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script\s*>/gi)]
    .filter(m=>!/\btype\s*=\s*["']text\/plain["']/i.test(m[0]));
  if(!all.length)throw Error('No executable loader found');
  return all[all.length-1][1];
}
async function layer(source,label){
  let output=null;
  const patch=source.match(/<script\b[^>]*id=["']compassGoalChartPatch["'][^>]*>([\s\S]*?)<\/script>/i)?.[1]||'';
  const doc={
    getElementById(id){if(id==='status')return status;if(id==='compassGoalChartPatch')return{textContent:patch};return null},
    open(){},write(html){output=html},close(){}
  };
  const fetchLocal=async url=>{
    const clean=String(url).split('?')[0].replace(/^\.\//,'');
    const target=path.resolve(root,clean);
    if(!target.startsWith(root+path.sep))throw Error('Invalid path: '+url);
    if(!fs.existsSync(target))return{ok:false,status:404,text:async()=>''};
    return{ok:true,status:200,text:async()=>fs.readFileSync(target,'utf8')};
  };
  const context={document:doc,console,fetch:fetchLocal,
    atob:s=>Buffer.from(s,'base64').toString('binary'),
    TextDecoder,Blob,Response,DecompressionStream,
    Uint8Array,ArrayBuffer,crypto:crypto.webcrypto,
    setTimeout,clearTimeout};
  vm.runInNewContext(executable(source),context,{timeout:15000,filename:label});
  const start=Date.now();
  while(!output&&Date.now()-start<45000)await new Promise(resolve=>setTimeout(resolve,30));
  if(!output)throw Error('Loader did not finish: '+label+'; '+status.textContent);
  if(!output.includes('<html'))throw Error('Not HTML after '+label);
  console.log('Rendered',label,'characters',output.length);
  return output;
}
async function main(){
  let source=read('scripts/index-loader-source.html');
  source=await layer(source,'index');
  source=await layer(source,'charts');
  source=await layer(source,'base');
  // Build-time replacement: old graph and Session Data DOM never reach browsers.
  function replaceUnique(from,to,label){
    const count=source.split(from).length-1;
    if(count!==1)throw Error('Static Progress '+label+' source mismatch: '+count);
    source=source.replace(from,to);
  }
  const progressStart=source.indexOf('<div id="profile-tab-progress" class="profile-tab">');
  const progressEnd=source.indexOf('<div id="profile-tab-docs" class="profile-tab">',progressStart);
  if(progressStart<0||progressEnd<progressStart)throw Error('Native Progress tab markup not found');
  const legacyMarkup=source.slice(progressStart,progressEnd);
  if(!legacyMarkup.includes('id="progressChart"')||!legacyMarkup.includes('id="studentSessionsBody"'))
    throw Error('Legacy Progress section changed unexpectedly');
  const nativeProgress='<div id="profile-tab-progress" class="profile-tab">'+
    '<section class="cpr-panel" aria-live="polite" aria-label="Program Progress">'+
    '<h2>Program Progress</h2><p class="muted" role="status">Loading student progress…</p>'+
    '</section></div>\n          ';
  source=source.slice(0,progressStart)+nativeProgress+source.slice(progressEnd);
  const oldFilterStart=source.indexOf("    $('progressProgramFilter').innerHTML=");
  const oldFilterEnd=source.indexOf('\n',oldFilterStart);
  if(oldFilterStart<0||oldFilterEnd<0)throw Error('Legacy filter assignment missing');
  source=source.slice(0,oldFilterStart)+source.slice(oldFilterEnd+1);
  const oldRendererStart=source.indexOf('  function filteredSessions(){');
  const oldRendererEnd=source.indexOf('  function compassProfileRoot(){',oldRendererStart);
  if(oldRendererStart<0||oldRendererEnd<oldRendererStart)throw Error('Legacy renderer region missing');
  const oldRenderer=source.slice(oldRendererStart,oldRendererEnd);
  if(!oldRenderer.includes('function renderProgress()')||!oldRenderer.includes('function avgAccuracy('))
    throw Error('Legacy Progress renderer changed unexpectedly');
  source=source.slice(0,oldRendererStart)+source.slice(oldRendererEnd);
  replaceUnique('renderDocuments();renderProgress();renderBehavior()','renderDocuments();renderBehavior()','initial render');
  replaceUnique(";if(name==='progress')renderProgress()}",'}','tab navigation');
  replaceUnique("$('progressProgramFilter').addEventListener('change',renderProgress);",'','legacy filter listener');
  const oldProgressLoader=source.indexOf('      if(!window.__compassProgressModuleRequested){');
  const loaderEnd=source.indexOf("      window.dispatchEvent(new Event('compass-progress-data'));",oldProgressLoader);
  if(oldProgressLoader<0||loaderEnd<oldProgressLoader)throw Error('Deferred Progress injection not found');
  source=source.slice(0,oldProgressLoader)+source.slice(loaderEnd);
  for(const obsolete of ['id="progressChart"','id="studentSessionsBody"','id="progressProgramFilter"','setTimeout(activate,30)'])
    if(source.includes(obsolete))throw Error('Old Progress residue remains: '+obsolete);
  // The former prototype CSS bypassed login and made Home render over the public page.
  // Never ship review-only visibility overrides in COMPASS production.
  const review=/<style\s+id=["']review-only["'][^>]*>[\s\S]*?<\/style>/gi;
  const reviewMatches=[...source.matchAll(review)];
  if(reviewMatches.length!==1)throw Error('Expected exactly one unsafe review-only stylesheet: '+reviewMatches.length);
  source=source.replace(review,'');
  if(source.includes('#app.hidden{display:block!important}'))throw Error('Unsafe app visibility override remains');
  const must=['id="sidebar"','page-home','loadStudentProfile','student_iep_goals','compass_program_sessions'];
  const missing=must.filter(v=>!source.includes(v));
  if(missing.length)throw Error('Missing app features: '+missing.join(', '));
  if(source.includes('Loading COMPASS 1/')||source.includes('BASE_EXPECTED'))throw Error('Nested loader found in static output');
  if(!source.toLowerCase().includes('login')&&!source.includes('signInWithPassword'))throw Error('Authentication not present');
  const css=['<style id="compass-static-layout-foundation">',
    'html,body{margin:0;max-width:100%;overflow-x:clip}',
    'body{display:block!important;width:100%;min-width:0}',
    '#landingScreen{width:100%;max-width:100%;margin:0}',
    '*,*::before,*::after{box-sizing:border-box}',
    '#sidebar{max-height:100dvh;overflow-y:auto;overscroll-behavior:contain}',
    '#page-home,#page-students,#page-student-profile,.page{min-width:0;max-width:100%}',
    '.content,.page>.content{min-width:0}',
    '@media(max-width:860px){#sidebar{max-height:100dvh}}',
    '</style>'].join('\n');
  if(!source.includes('compass-static-layout-foundation'))source=source.replace(/<\/head>/i,css+'\n</head>');
  // Append the goal-display module to the finished document, never inside a JS string.
  const docEnd=source.toLowerCase().lastIndexOf('</body>');
  if(docEnd<0)throw Error('Final COMPASS HTML has no closing body');
  const linkedModule='<script src="./assigned-program-iep-links.js?v=1"></scr'+'ipt>\n';  const progressModule='<script src="./progress-profile-live-v1.js?v=3"></scr'+'ipt>\n';

  source=source.slice(0,docEnd)+linkedModule+progressModule+source.slice(docEnd);
  // The browser treats every literal </script> as an end tag, including strings.
  // Parse all inline blocks now; refuse to publish syntactically broken login/runner code.
  const scripts=[...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(m=>!(/\bsrc\s*=/.test(m[1])||/text\/plain/.test(m[1])));
  if(scripts.length<3)throw Error('Expected Supabase, config, and COMPASS application scripts; found '+scripts.length);
  scripts.forEach((m,i)=>{try{new vm.Script(m[2],{filename:'compass-inline-'+i+'.js'})}
    catch(err){throw Error('COMPASS JavaScript syntax failure, block '+i+': '+err.message)}});
  fs.writeFileSync(path.join(root,'index.html'),source,'utf8');
  console.log('COMPASS static build complete:',source.length,'characters');
}
main().catch(err=>{console.error('BUILD_FAILED',err);process.exit(1)});
