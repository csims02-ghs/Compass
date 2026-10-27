/* COMPASS universal Page 2 visual standard.
   Inject in the rendered student program, never overwrite program scores/data. */
(function(global){
  'use strict';
  const STYLE_URL='./compass-page2-standard.css?v=20261027-v3';
  let stylePromise=null;
  function isPage2Program(html){
    return typeof html==='string' &&
      /id=["']runPage["']/.test(html) &&
      /id=["']behaviorList["']/.test(html) &&
      /class=["'][^"']*run-grid/.test(html);
  }
  async function standardize(html){
    if(!isPage2Program(html))return html;
    if(html.includes('id="compass-definitive-page2-v3"'))return html;
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
    return runner.replace(/<\/head>/i,'<style id="compass-definitive-page2-v3">\n'+style+'\n</style></head>');
  }
  global.COMPASS_PAGE2_STANDARD=Object.freeze({version:'20261027-v3',isPage2Program,standardize});
})(window);
