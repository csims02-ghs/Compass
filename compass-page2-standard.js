/* COMPASS universal Page 2 visual standard.
   Inject in the rendered student program, never overwrite program scores/data. */
(function(global){
  'use strict';
  const STYLE_URL='./compass-page2-standard.css?v=20261027-v2';
  let stylePromise=null;
  function isPage2Program(html){
    return typeof html==='string' &&
      /id=["']runPage["']/.test(html) &&
      /id=["']behaviorList["']/.test(html) &&
      /class=["'][^"']*run-grid/.test(html);
  }
  async function standardize(html){
    if(!isPage2Program(html))return html;
    if(html.includes('id="compass-definitive-page2-v1"'))return html;
    if(!stylePromise)stylePromise=fetch(STYLE_URL,{cache:'no-store'}).then(async r=>{
      if(!r.ok)throw Error('COMPASS Page 2 stylesheet unavailable ('+r.status+')');
      return r.text();
    }).catch(e=>{stylePromise=null;throw e});
    const style=await stylePromise;
    // Never change mastery verification, recorded data or session sync.
    // Remove only the transient, non-actionable wording from the displayed runner;
    // valid verified mastery progress remains visible.
    const cleaned=html.replaceAll('Student mastery could not be verified with COMPASS; please reconnect.','');
    return cleaned.replace(/<\/head>/i,'<style id="compass-definitive-page2-v1">\n'+style+'\n</style></head>');
  }
  global.COMPASS_PAGE2_STANDARD=Object.freeze({version:'20261026-v1',isPage2Program,standardize});
})(window);
