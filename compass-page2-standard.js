/* COMPASS universal Page 2 visual standard.
   Inject in the rendered student program, never overwrite program scores/data. */
(function(global){
  'use strict';
  const STYLE_URL='./compass-page2-standard.css?v=20261027-v3';
  let stylePromise=null;
  // Handwashing and Hygiene is a specialist 65-target legacy runner.
  // Preserve the recognition and application engine, add the V25 38-marker UI.
  async function withHandwashing(html){
    if(!html.includes("const PROGRAM_CODE='CP-132-HANDWASHING-AND-HYGIENE'"))return null;
    if(html.includes('id="compass-handwashing-hygiene-v25-logic"'))return html;
    if(!/id=["']workspace["']/.test(html)||!/id=["']behaviorBar["']/.test(html)||
       !/id=["']setupToggle["']/.test(html))throw Error('Handwashing runner markup missing');
    const load=async ext=>{
      const url='./compass-handwashing-hygiene-v25.'+ext+'?v=20261031-v3';
      const r=await fetch(url,{cache:'no-store'});
      if(!r.ok)throw Error('Handwashing V25 asset missing: '+url);
      return r.text();
    };
    const [css,js]=await Promise.all([load('css'),load('js')]);
    return html.replace(/<\/head>/i,'<style id="compass-handwashing-hygiene-v25-ui">'+css+'</style></head>')
      .replace(/<\/body>/i,'<script id="compass-handwashing-hygiene-v25-logic">'+js+'<'+'/script></body>');
  }

  // Native 1:1 Counting uses the V25 two-screen runner. Add only the missing
  // setup-save toolbar; never substitute a legacy runner or change trial logic.
  async function withCountingSave(html){
    if(!/id=["']setupPage["']/.test(html)||
       !/id=["']benchmarkSelect["']/.test(html)||
       !/id=["']chainSelect["']/.test(html)||
       !html.includes('1:1 Counting'))return html;
    if(html.includes('id="compass-counting-setup-save-addon"'))return html;
    const [css,js]=await Promise.all(['css','js'].map(async ext=>{
      const response=await fetch('./compass-counting-setup-save.'+ext+'?v=20261031-v2',{cache:'no-store'});
      if(!response.ok)throw Error('1:1 Counting Save Setup asset unavailable ('+ext+')');
      return response.text();
    }));
    if(!/<\/head>/i.test(html)||!/<\/body>/i.test(html))throw Error('1:1 Counting document is incomplete');
    return html.replace(/<\/head>/i,'<style id="compass-counting-setup-save-style">'+css+'</style></head>')
      .replace(/<\/body>/i,'<script id="compass-counting-setup-save-addon">'+js+'<'+'/script></body>');
  }

  function isPage2Program(html){
    return typeof html==='string' &&
      /id=["']runPage["']/.test(html) &&
      /id=["']behaviorList["']/.test(html) &&
      /class=["'][^"']*run-grid/.test(html);
  }
  async function standardize(html){
    if(typeof html!=='string')return html;
    const handwashing=await withHandwashing(html);
    if(handwashing!==null)return handwashing;
    // Community Identification uses its own native V25 two-page runner.
    // Its rendered config is stored under the "code" key, not "program_code".
    // Do not overlay generic Page 2 CSS or an old community-specific runner.
    if(isPage2Program(html)&&
      (html.includes('"code":"CP-COMMUNITY-IDENTIFICATION"')||
       html.includes('"code": "CP-COMMUNITY-IDENTIFICATION"')||
       html.includes('"code":"CP-115-CONSTRUCTIVE-PLAY-AND-BUILDING"')||
       html.includes('"code": "CP-115-CONSTRUCTIVE-PLAY-AND-BUILDING"')||
       html.includes('"code":"CP-107-COPYING-SHAPES-AND-VISUAL-MOTOR-INTEGRATION"')||
       html.includes('"code": "CP-107-COPYING-SHAPES-AND-VISUAL-MOTOR-INTEGRATION"')||
       html.includes('"code":"CP-EMOTION-IDENTIFICATION"')||
       html.includes('"code": "CP-EMOTION-IDENTIFICATION"')||
       html.includes('"code":"CP-127-FINE-MOTOR-IMITATION"')||
       html.includes('"code": "CP-127-FINE-MOTOR-IMITATION"')||
       html.includes('"code":"CP-FOOD-IDENTIFICATION"')||
       html.includes('"code": "CP-FOOD-IDENTIFICATION"')||
       html.includes('"code":"CP-DIR-VISUAL-087"')||
       html.includes('"code": "CP-DIR-VISUAL-087"')||
       html.includes('"code":"CP-READ-INFER-095"')||
       html.includes('"code": "CP-READ-INFER-095"')||
       html.includes('"code":"CP-WH-CONCEPTS"')||
       html.includes('"code": "CP-WH-CONCEPTS"')||
       html.includes('"code":"CP-126-GROSS-MOTOR-IMITATION"')||
       html.includes('"code": "CP-126-GROSS-MOTOR-IMITATION"')||
       html.includes('"code":"CP-LETTER-TRACING"')||
       html.includes('"code": "CP-LETTER-TRACING"')))return html;
    // Updated programs use their own program-specific V25 two-page interface.
    // Never substitute a review-only runner or silently fall back to old UI if an adapter fails.
    const adapters=[
      {code:'CP-BODY-PARTS',slug:'body-parts',tag:'compass-body-parts-v25',version:'20261027-v7'},
      {code:'CP-COLORS',slug:'colors',tag:'compass-colors-v25',version:'20261027-v5'},
      {code:'CP-CLOTHING-IDENTIFICATION',slug:'clothing',tag:'compass-clothing-v25',version:'20261027-v5'},
      {code:'CP-107-COPYING-SHAPES-AND-VISUAL-MOTOR-INTEGRATION',slug:'copying-shapes',tag:'compass-copying-shapes-v25',version:'20261027-v2'},
      {code:'CP-127-FINE-MOTOR-IMITATION',slug:'fine-motor-imitation',tag:'compass-fine-motor-imitation-v25',version:'20261027-v1'},
      {code:'CP-DIR-VISUAL-087',slug:'functions',tag:'compass-functions-v25',version:'20261027-v1'},
      {code:'CP-ADDITION',slug:'addition',tag:'compass-addition-v25',version:'20261031-v1'}
    ];
    const updated=adapters.find(a=>html.includes('"program_code":"'+a.code+'"')||
      html.includes('"program_code": "'+a.code+'"')||
      (a.code==='CP-COLORS'&&(html.includes('"code":"CP-COLORS"')||html.includes('"code": "CP-COLORS"'))));
    if(updated){
      // Body Parts now has a first-class V25 (two-page) runner in Supabase.
      // Its native setupPage/runPage/behaviorList/run-grid markup is *not*
      // compatible with the previous legacy .program-setup/#workspace adapter.
      // Pass the native V25 runner through unchanged; do not fetch/inject old JS.
      if((updated.code==='CP-BODY-PARTS'||updated.code==='CP-CLOTHING-IDENTIFICATION'||updated.code==='CP-COLORS') && isPage2Program(html))return html;
      const marker=updated.slug==='colors'?'compass-colors-v25-css':'compass-'+updated.slug+'-v25-ui';
      const scriptId=updated.slug==='colors'?'compass-colors-v25-js':'compass-'+updated.slug+'-v25-logic';
      if(html.includes('id="'+marker+'"')&&html.includes('id="'+scriptId+'"'))return html;
      if(!/<\/head>/i.test(html)||!/<\/body>/i.test(html))throw Error('V25 runner document incomplete for '+updated.code);
      // Adapters are only installed on their matching production runner markup.
      if(!/class=["'][^"']*program-setup/.test(html)||!/id=["']workspace["']/.test(html)||
         !/id=["']behaviorBar["']/.test(html))throw Error('V25 production markup missing for '+updated.code);
      const read=async extension=>{
        const path='./compass-'+updated.slug+'-v25.'+extension+'?v='+updated.version;
        const response=await fetch(path,{cache:'no-store'});
        if(!response.ok)throw Error('V25 program assets unavailable: '+path);
        return response.text();
      };
      const [css,js]=await Promise.all([read('css'),read('js')]);
      let shared='';
      if(updated.slug==='functions'){
        const response=await fetch('./compass-body-parts-v25.css?v=20261027-v4',{cache:'no-store'});
        if(!response.ok)throw Error('Functions V25 shared layout assets are unavailable');
        shared=await response.text();
      }
      return html.replace(/<\/head>/i,'<style id="'+marker+'">'+shared+'\n'+css+'</style></head>')
        .replace(/<\/body>/i,'<script id="'+scriptId+'">'+js+'<'+'/script></body>');
    }
    if(!isPage2Program(html))return withCountingSave(html);
    if(html.includes('id="compass-definitive-page2-v3"'))return withCountingSave(html);
    // Existing offline packs may carry the previous injected style.
    // Replace it once, instead of stacking competing layout patches.
    const current=html.replace(/<style id="compass-definitive-page2-v[12]">[\s\S]*?<\/style>/gi,'');
    if(!stylePromise)stylePromise=fetch(STYLE_URL,{cache:'no-store'}).then(async r=>{
      if(!r.ok)throw Error('COMPASS Page 2 stylesheet unavailable ('+r.status+')');
      return r.text();
    }).catch(e=>{stylePromise=null;throw e});
    const style=await stylePromise;
    // Never change mastery verification, recorded data or session sync.
    // Remove only the transient, non-actionable wording from the displayed runner;
    // valid verified mastery progress remains visible.
    const cleaned=current.replaceAll('Student mastery could not be verified with COMPASS; please reconnect.','');
    // Patch only the known Actions runner's image toggle; preserve scoring and session logic.
    const legacyImageToggle="$('imagesOnlyBtn').addEventListener('click',()=>{imagesOnly=true;$('runGrid').classList.add('no-controls');$('resetViewBtn').hidden=false;});\n$('resetViewBtn').addEventListener('click',()=>{imagesOnly=false;$('runGrid').classList.remove('no-controls');$('resetViewBtn').hidden=true;});";
    const improvedImageToggle="// Images Only presents student materials full-width. The SAME control exits this view.\nconst imageOnlyToggleButton=$('imagesOnlyBtn');\nconst imageOnlyScoreHead=imageOnlyToggleButton.parentElement;\nconst imageOnlyStudentHeader=document.querySelector('#runPage .material-top');\nfunction setImagesOnlyView(enabled){\n  imagesOnly=!!enabled;\n  $('runGrid').classList.toggle('no-controls',imagesOnly);\n  if(imagesOnly && imageOnlyStudentHeader)imageOnlyStudentHeader.appendChild(imageOnlyToggleButton);\n  else imageOnlyScoreHead.appendChild(imageOnlyToggleButton);\n  imageOnlyToggleButton.textContent=imagesOnly?'← Exit Images Only':'▣ Images Only';\n  imageOnlyToggleButton.setAttribute('aria-pressed',String(imagesOnly));\n  $('resetViewBtn').hidden=true;\n}\nimageOnlyToggleButton.addEventListener('click',()=>setImagesOnlyView(!imagesOnly));\n$('resetViewBtn').addEventListener('click',()=>setImagesOnlyView(false));";
    const runner=cleaned.includes(legacyImageToggle)?cleaned.replace(legacyImageToggle,improvedImageToggle):cleaned;
    return withCountingSave(runner.replace(/<\/head>/i,'<style id="compass-definitive-page2-v3">\n'+style+'\n</style></head>'));
  }
  global.COMPASS_PAGE2_STANDARD=Object.freeze({version:'20261031-v23-handwashing-release',isPage2Program,standardize});
})(window);
