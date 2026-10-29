/* COMPASS sidebar Full Screen / Show Menu. UI-only, no page navigation or data changes. */
(function(){
  'use strict';
  function initWorkspaceFullscreen(){
    const app=document.getElementById('app');
    const sidebar=document.getElementById('sidebar');
    const fullscreenBtn=document.getElementById('workspaceFullscreenToggle');
    const restoreBtn=document.getElementById('workspaceShowMenuToggle');
    if(!app||!sidebar||!fullscreenBtn||!restoreBtn||fullscreenBtn.dataset.bound==='true')return;
    fullscreenBtn.dataset.bound='true';
    function setExpanded(expanded){
      const wasExpanded=app.classList.contains('compass-focus-mode');
      app.classList.toggle('compass-focus-mode',expanded);
      fullscreenBtn.setAttribute('aria-pressed',String(expanded));
      fullscreenBtn.setAttribute('aria-label',expanded?'Show Menu':'Full Screen — hide left navigation menu');
      fullscreenBtn.title=expanded?'Show Menu':'Full Screen — hide navigation menu';
      const label=fullscreenBtn.querySelector('.workspace-fullscreen-label');
      if(label)label.textContent=expanded?'Show Menu':'Full Screen';
      restoreBtn.hidden=!expanded;
      restoreBtn.setAttribute('aria-hidden',String(!expanded));
      restoreBtn.tabIndex=expanded?0:-1;
      if(expanded){
        sidebar.classList.remove('open');
      }else if(wasExpanded && window.innerWidth<=850){
        // Mobile: the sidebar otherwise remains translated offscreen.
        sidebar.classList.add('open');
      }
      // Reflow graphs and dashboards after changing the available width.
      window.requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
    }
    fullscreenBtn.addEventListener('click',()=>setExpanded(true));
    restoreBtn.addEventListener('click',()=>setExpanded(false));
    setExpanded(false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initWorkspaceFullscreen,{once:true});
  else initWorkspaceFullscreen();
})();
