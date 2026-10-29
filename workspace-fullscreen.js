/* UI-only workspace expansion. The entire app remains mounted and the active page is preserved. */
(function(){
  'use strict';
  function initWorkspaceFullscreen(){
    const app=document.getElementById('app');
    const sidebar=document.getElementById('sidebar');
    const btn=document.getElementById('workspaceFullscreenToggle');
    if(!app||!sidebar||!btn||btn.dataset.bound==='true')return;
    btn.dataset.bound='true';
    function setExpanded(expanded){
      app.classList.toggle('compass-focus-mode',expanded);
      btn.setAttribute('aria-pressed',String(expanded));
      btn.setAttribute('aria-label',expanded?'Restore left navigation menu':'Full screen — hide left navigation menu');
      btn.title=expanded?'Restore navigation menu':'Full screen — hide navigation menu';
      const label=btn.querySelector('.workspace-fullscreen-label');
      if(label)label.textContent=expanded?'Show Menu':'Full Screen';
      if(expanded)sidebar.classList.remove('open');
      // Reflow graphics that size themselves based on the available workspace.
      window.requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
    }
    btn.addEventListener('click',()=>setExpanded(!app.classList.contains('compass-focus-mode')));
    setExpanded(false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initWorkspaceFullscreen,{once:true});
  else initWorkspaceFullscreen();
})();
