/* COMPASS: consistently display date-only values in MM/DD/YYYY.
 * Only user-visible text nodes change. Native date inputs, data attributes,
 * storage keys, API payloads and source timestamps remain ISO formatted. */
(function () {
  'use strict';
  const isoDate=/(^|[^\d])((?:19|20)\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?=$|[^\dT])/g;
  const excluded='script,style,textarea,input,select,option,pre,code,svg,[contenteditable],[data-keep-iso-date]';
  const format=text=>String(text).replace(isoDate,(_,prefix,year,month,day)=>prefix+month+'/'+day+'/'+year);
  const isEligible=node=>{
    const parent=node&&node.parentElement;
    return !!parent && !parent.closest(excluded);
  };
  function visit(node){
    if(!node)return;
    if(node.nodeType===3) {
      if(!isEligible(node))return;
      const old=node.nodeValue;
      if(!old||!isoDate.test(old)){isoDate.lastIndex=0;return;}
      isoDate.lastIndex=0;
      const next=format(old);
      if(next!==old){
        const parent=node.parentElement;
        if(parent && parent.tagName==='TD' && /^\s*\d{4}-\d\d-\d\d\s*$/.test(old))parent.classList.add('compass-date-nowrap');
        node.nodeValue=next;
      }
      return;
    }
    if(node.nodeType!==1||node.matches(excluded))return;
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    let n;
    while((n=walker.nextNode()))visit(n);
  }
  function init(){
    const root=document.getElementById('app');
    if(!root||root.dataset.dateDisplayReady==='true')return;
    root.dataset.dateDisplayReady='true';
    visit(root);
    const observer=new MutationObserver(changes=>{
      for(const change of changes){
        if(change.type==='characterData')visit(change.target);
        else for(const n of change.addedNodes)visit(n);
      }
    });
    observer.observe(root,{childList:true,characterData:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();