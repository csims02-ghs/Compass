/* COMPASS Session & Notes four-tab navigation. This component does not write student data. */
(function(){
  'use strict';
  const names=['sessions','notes','history','manual'];
  function init(){
    const nav=document.getElementById('sessionWorkspaceTabs');
    if(!nav||nav.dataset.tabsReady==='true')return;
    const tabs=names.map(name=>nav.querySelector('[data-session-tab="'+name+'"]'));
    const panels=names.map(name=>document.getElementById('sessionPanel'+name.charAt(0).toUpperCase()+name.slice(1)));
    if(tabs.some(x=>!x)||panels.some(x=>!x))return;
    nav.dataset.tabsReady='true';
    function activate(name,focus){
      const index=names.indexOf(name);
      if(index<0)return;
      tabs.forEach((tab,i)=>{
        const selected=i===index;
        tab.classList.toggle('active',selected);
        tab.setAttribute('aria-selected',String(selected));
        tab.tabIndex=selected?0:-1;
        panels[i].hidden=!selected;
      });
      nav.dataset.activeTab=name;
      if(focus)tabs[index].focus({preventScroll:true});
    }
    nav.addEventListener('click',event=>{
      const tab=event.target.closest('[data-session-tab]');
      if(tab&&nav.contains(tab))activate(tab.dataset.sessionTab,false);
    });
    nav.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      const current=event.target.closest('[data-session-tab]');
      if(!current||!nav.contains(current))return;
      event.preventDefault();
      const at=names.indexOf(current.dataset.sessionTab);
      const next=event.key==='Home'?0:event.key==='End'?names.length-1:
        (at+(event.key==='ArrowRight'?1:-1)+names.length)%names.length;
      activate(names[next],true);
    });
    activate('sessions',false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
