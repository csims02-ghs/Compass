/* COMPASS Programs — approved Edit Programs interface (October 2026).
   Backend authority: Supabase auth + program_status + guarded RPC/runner.
   Status selection never changes student data or existing program content. */
(function(){
"use strict";
const URL_ROOT="https://ykkexfsbnnxgncnyaksr.supabase.co";
const KEY="sb_publishable_3qkWcBut_bVwI6mlhOQOzA_50z_46cY";
const $=id=>document.getElementById(id);
const norm=v=>String(v||"").trim().toLocaleLowerCase().replace(/\s+/g," ");
const plain=v=>String(v??"");
const authClient=window.supabase?.createClient(URL_ROOT,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
if(!authClient)return;
let programs=[],byName=new Map(),isAdmin=false,editing={},busy=false,started=false,observing=false,frame=0,blobUrls=[],loading=false;
function pageVisible(){
 const flag=document.body?.dataset?.compassPage||"";
 if(flag)return flag==="programs";
 const section=$("page-programs");if(section)return !section.hidden&&getComputedStyle(section).display!=="none";
 return [...document.querySelectorAll("h1,h2")].some(el=>norm(el.textContent)==="compass programs");
}
function toast(message,bad=false){
 let el=$("compassHoldToast");if(!el)return;
 el.textContent=message;el.style.background=bad?"#981d26":"#17365d";el.hidden=false;
 clearTimeout(el._t);el._t=setTimeout(()=>{el.hidden=true;},4500);
}
function statusOf(p){return p?.program_status==="on_hold"?"on_hold":"active";}
function updateCount(){
 const active=programs.filter(p=>statusOf(p)==="active").length;
 const header=[...document.querySelectorAll("h1,h2")].find(n=>norm(n.textContent)==="compass programs");
 const desc=header?.parentElement?.querySelector("p,small");
 if(desc&&/active compass|instructional programs/i.test(desc.textContent||"")){
   const next=active+" active COMPASS instructional programs connected to the shared programming runners.";
   if(desc.textContent!==next)desc.textContent=next;
 }
 const labels=[...document.querySelectorAll("small,label,strong,span,h3,h4")];
 const metric=labels.find(n=>norm(n.textContent)==="active programs");
 const target=metric?.parentElement?.querySelector("strong,b,.value,[data-count]");
 if(target&&/^[\d,]+$/.test((target.textContent||"").trim())&&target.textContent!==String(active))target.textContent=String(active);
}
function resolveName(row){
 const first=row.cells?.[0];if(!first)return null;
 const anchor=first.querySelector("a,button,.name,.program-name");
 const text=norm(anchor?.textContent||first.textContent);
 if(byName.has(text))return byName.get(text);
 return programs.find(p=>text===norm(p.program_name)||text.startsWith(norm(p.program_name)+" "));
}
function findTable(){
 return [...document.querySelectorAll("table")].find(t=>{
 const h=norm(t.querySelector("thead")?.textContent||"");
 return h.includes("program name")&&h.includes("status")&&h.includes("details");
 })||null;
}
function paintRows(){
 if(!pageVisible()||!programs.length)return;
 const tbl=findTable();if(!tbl)return;
 const headers=[...tbl.querySelectorAll("thead th")].map(x=>norm(x.textContent));
 const idx=headers.indexOf("status"),detail=headers.indexOf("details");
 if(idx<0||detail<0)return;
 for(const row of tbl.querySelectorAll("tbody tr")){
  const p=resolveName(row);if(!p||!row.cells||row.cells.length<=Math.max(idx,detail))continue;
  row.dataset.compassHoldCode=p.program_code;
  const held=statusOf(p)==="on_hold",cell=row.cells[idx];
  const existing=cell.querySelector(".compass-hold-pill");
  if(!existing||existing.dataset.state!==statusOf(p)){
   cell.replaceChildren();
   const pill=document.createElement("span");pill.className="compass-hold-pill "+(held?"hold":"active");
   pill.dataset.state=statusOf(p);pill.textContent=held?"On Hold":"Active";cell.appendChild(pill);
  }
  const button=row.cells[detail].querySelector("button,a");
  if(button){
   if(held&&!isAdmin){
    if(!button.dataset.compassOriginalText)button.dataset.compassOriginalText=button.textContent||"Open";
    button.textContent="On Hold";button.setAttribute("aria-disabled","true");button.classList.add("compass-hold-locked");
    if("disabled" in button)button.disabled=true;
   }else{
    if(button.dataset.compassOriginalText){button.textContent=button.dataset.compassOriginalText;delete button.dataset.compassOriginalText;}
    button.removeAttribute("aria-disabled");button.classList.remove("compass-hold-locked");
    if("disabled" in button)button.disabled=false;
   }
  }
 }
 updateCount();
}
function schedulePaint(){
 if(frame||!pageVisible())return;
 frame=requestAnimationFrame(()=>{frame=0;paintRows();setVisibility();});
}
function setVisibility(){
 const btn=$("compassEditProgramsFab");if(!btn)return;
 btn.hidden=!(isAdmin&&pageVisible());
}
async function reload(){
 if(loading)return;loading=true;
 try{
  const {data,error}=await authClient.from("compass_programming_programs")
    .select("id,program_code,program_name,description,program_status,active")
    .eq("active",true).order("program_name");
  if(error)throw error;
  programs=data||[];byName=new Map(programs.map(p=>[norm(p.program_name),p]));
  schedulePaint();
 }catch(err){console.warn("COMPASS program availability unavailable",err);toast("Could not load program statuses. Please refresh.",true);}
 finally{loading=false;}
}
const statusPill=(state)=>{const span=document.createElement("span");span.className="compass-hold-pill "+(state==="on_hold"?"hold":"active");span.textContent=state==="on_hold"?"On Hold":"Active";return span;};
function stagedChanges(){return Object.entries(editing).filter(([code,val])=>programs.some(p=>p.program_code===code&&statusOf(p)!==val)).map(([code,val])=>({program_code:code,status:val}));}
function renderEditor(){
 const list=$("compassHoldEditList");if(!list)return;
 const search=norm($("compassHoldSearch").value),rows=programs.filter(p=>norm(p.program_name).includes(search));
 const frag=document.createDocumentFragment();
 for(const p of rows){
  const value=editing[p.program_code]||statusOf(p);
  const line=document.createElement("div");line.className="compass-hold-edit-row";
  if(value!==statusOf(p))line.classList.add("changed");
  const label=document.createElement("strong");label.textContent=p.program_name;
  const pill=statusPill(value);
  const sel=document.createElement("select");sel.dataset.programCode=p.program_code;
  sel.setAttribute("aria-label","Status for "+p.program_name);
  sel.add(new Option("Active","active"));sel.add(new Option("On Hold","on_hold"));sel.value=value;
  line.append(label,pill,sel);frag.append(line);
 }
 list.replaceChildren(frag);
 $("compassHoldShowing").textContent=rows.length+" programs";
 const changes=stagedChanges();$("compassHoldPending").textContent=changes.length?changes.length+" unsaved change"+(changes.length===1?"":"s"):"No unsaved changes";
 $("compassHoldSave").disabled=busy||!changes.length;
}
function closeEdit(){const d=$("compassHoldDialog");if(d?.open)d.close();editing={};}
async function save(){
 if(!isAdmin||busy)return;
 const changes=stagedChanges();if(!changes.length)return;
 busy=true;$("compassHoldSave").disabled=true;$("compassHoldSave").textContent="Saving…";
 try{
  const {data,error}=await authClient.rpc("compass_admin_set_program_statuses",{p_updates:changes});
  if(error||!data?.ok)throw Error(error?.message||"Could not save status changes");
  for(const change of changes){
   const p=programs.find(x=>x.program_code===change.program_code);if(p)p.program_status=change.status;
  }
  closeEdit();toast(changes.length+" program status"+(changes.length===1?"":"es")+" saved.");
  paintRows();await reload();window.dispatchEvent(new CustomEvent("compass-program-status-changed",{detail:{changes}}));
 }catch(e){toast(e.message||"Unable to save changes",true);}
 finally{busy=false;$("compassHoldSave").textContent="Save Changes";renderEditor();}
}
async function adminOpen(program){
 const win=window.open("about:blank","_blank");
 if(!win){toast("Allow popups to open held programs.",true);return;}
 win.document.title="Opening "+program.program_name;
 win.document.body.innerHTML="<p style='font:16px Arial;padding:25px'>Opening COMPASS Program…</p>";
 try{
  const {data:{session}}=await authClient.auth.getSession();
  if(!session?.access_token)throw Error("Sign in again to open this program.");
  const url=URL_ROOT+"/functions/v1/compass-program-runner?program_code="+encodeURIComponent(program.program_code)+"&format=json";
  const response=await fetch(url,{cache:"no-store",headers:{"Authorization":"Bearer "+session.access_token,"apikey":KEY}});
  const json=await response.json();if(!response.ok||!json?.ok||!json.html)throw Error(json.error||"Program unavailable");
  const blob=URL.createObjectURL(new Blob([json.html],{type:"text/html;charset=UTF-8"}));
  blobUrls.push(blob);win.location.replace(blob);setTimeout(()=>URL.revokeObjectURL(blob),120000);
 }catch(e){win.document.body.textContent="Program could not open: "+e.message;toast(e.message,true);}
}
function interceptOpen(e){
 if(!pageVisible())return;
 const control=e.target.closest?.("button,a");if(!control)return;
 const row=control.closest("tr[data-compass-hold-code]");if(!row)return;
 const p=programs.find(x=>x.program_code===row.dataset.compassHoldCode);
 if(!p||statusOf(p)!=="on_hold")return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 if(!isAdmin){toast("This program is On Hold. Only Platform Admin can open it.",true);return;}
 adminOpen(p);
}
function build(){
 if($("compassEditProgramsFab"))return;
 const style=document.createElement("style");style.id="compassHoldStyles";
 style.textContent=`
 .compass-hold-pill{display:inline-flex;align-items:center;justify-content:center;padding:4px 9px;border-radius:999px;font:800 11px/1.35 Arial,sans-serif;white-space:nowrap}
 .compass-hold-pill.active{background:#e4f6e9;color:#13794b}
 .compass-hold-pill.hold{background:#fde4e8;color:#b4232f}
 .compass-hold-locked{opacity:.55!important;cursor:not-allowed!important;color:#a32835!important}
 #compassEditProgramsFab{position:fixed;bottom:24px;right:26px;z-index:9997;border:0;border-radius:12px;padding:14px 19px;min-height:50px;background:#1769d3;color:#fff;font:800 13px Arial,sans-serif;box-shadow:0 8px 24px #123f7359;cursor:pointer}
 #compassEditProgramsFab[hidden],#compassHoldToast[hidden]{display:none!important}
 #compassEditProgramsFab:hover{background:#0c58b7}
 #compassHoldDialog{padding:0;width:min(820px,calc(100vw - 26px));max-height:min(92dvh,775px);border:1px solid #d4e3ef;border-radius:16px;color:#12315a;font:13px Arial,sans-serif;box-shadow:0 24px 65px #0e315244}
 #compassHoldDialog::backdrop{background:#071a36ad}
 .compass-hold-d-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:18px 22px;border-bottom:1px solid #e6edf5}
 .compass-hold-d-head h2{font-size:21px;margin:0 0 5px;color:#123b6b}.compass-hold-d-head p{font-size:12px;margin:0;color:#64748b;line-height:1.5}
 .compass-hold-d-body{padding:16px 22px}.compass-hold-d-search{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
 #compassHoldSearch{flex:1;min-width:180px;padding:10px 12px;border:1px solid #caddec;border-radius:9px;min-height:42px}
 #compassHoldShowing{font-size:11px;color:#6c8195;font-weight:700}
 #compassHoldEditList{max-height:370px;overflow:auto;border:1px solid #e2e9f2;border-radius:10px}
 .compass-hold-edit-row{display:grid;grid-template-columns:minmax(0,1fr) 80px 140px;gap:12px;align-items:center;padding:10px 12px;border-bottom:1px solid #edf2f7}
 .compass-hold-edit-row:last-child{border:0}.compass-hold-edit-row.changed{background:#f3f8ff}
 .compass-hold-edit-row strong{font-size:12px;line-height:1.35}
 .compass-hold-edit-row select{width:100%;min-height:39px;padding:8px;border:1px solid #caddec;border-radius:8px;color:#12315a;background:white}
 .compass-hold-d-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 22px;border-top:1px solid #e6edf5}
 .compass-hold-d-actions{display:flex;align-items:center;gap:8px}
 .compass-hold-d-actions button,.compass-hold-close{border:1px solid #cddce9;background:white;border-radius:9px;padding:10px 15px;color:#123b6b;font-weight:800;cursor:pointer;min-height:42px}
 .compass-hold-d-actions button.primary{background:#2175e7;border-color:#2175e7;color:white}
 .compass-hold-d-actions button:disabled{opacity:.45;cursor:default}
 #compassHoldPending{font-size:11px;color:#64748b}
 #compassHoldToast{position:fixed;right:26px;bottom:88px;z-index:9999;padding:13px 17px;border-radius:10px;background:#17365d;color:white;font:13px Arial;box-shadow:0 8px 22px #12345670;max-width:340px}
 @media(max-width:600px){#compassEditProgramsFab{right:13px;bottom:14px}.compass-hold-edit-row{grid-template-columns:minmax(0,1fr) 105px;gap:8px}.compass-hold-edit-row .compass-hold-pill{display:none}.compass-hold-d-head,.compass-hold-d-body,.compass-hold-d-foot{padding-left:13px;padding-right:13px}}
 `;
 document.head.appendChild(style);
 const fab=document.createElement("button");fab.id="compassEditProgramsFab";fab.textContent="✎ Edit Programs";fab.type="button";fab.hidden=true;
 const dialog=document.createElement("dialog");dialog.id="compassHoldDialog";
 dialog.innerHTML=`<div class="compass-hold-d-head"><div><h2>Edit Programs</h2><p>Change program availability. Only Platform Admin can open On Hold programs.</p></div><button type="button" id="compassHoldClose" class="compass-hold-close" aria-label="Close">×</button></div><div class="compass-hold-d-body"><div class="compass-hold-d-search"><input id="compassHoldSearch" type="search" placeholder="Search programs…" aria-label="Find a program"><span id="compassHoldShowing"></span></div><div id="compassHoldEditList"></div></div><div class="compass-hold-d-foot"><span id="compassHoldPending">No unsaved changes</span><div class="compass-hold-d-actions"><button type="button" id="compassHoldCancel">Cancel</button><button type="button" class="primary" id="compassHoldSave" disabled>Save Changes</button></div></div>`;
 const toastBox=document.createElement("div");toastBox.id="compassHoldToast";toastBox.setAttribute("role","status");toastBox.hidden=true;
 document.body.append(fab,dialog,toastBox);
 fab.addEventListener("click",()=>{if(!isAdmin)return;editing={};$("compassHoldSearch").value="";renderEditor();dialog.showModal();});
 $("compassHoldClose").addEventListener("click",closeEdit);$("compassHoldCancel").addEventListener("click",closeEdit);
 $("compassHoldSearch").addEventListener("input",renderEditor);
 $("compassHoldEditList").addEventListener("change",e=>{
  const sel=e.target.closest("select[data-program-code]");if(!sel)return;
  const code=sel.dataset.programCode,entry=programs.find(p=>p.program_code===code);if(!entry)return;
  if(sel.value===statusOf(entry))delete editing[code];else editing[code]=sel.value;
  renderEditor();
 });
 $("compassHoldSave").addEventListener("click",save);
 document.addEventListener("click",interceptOpen,true);
}
async function init(){
 if(started)return;started=true;build();
 try{
  const {data:{session}}=await authClient.auth.getSession();
  if(!session?.user){setVisibility();return;}
  const {data:profile}=await authClient.from("profiles").select("role,active").eq("id",session.user.id).maybeSingle();
  isAdmin=profile?.active===true&&profile?.role==="platform_admin";
  await reload();
  const observer=new MutationObserver(()=>{schedulePaint();});
  observer.observe(document.body,{subtree:true,childList:true});
  authClient.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){isAdmin=false;setVisibility();}});
  document.addEventListener("click",()=>setTimeout(schedulePaint,50),true);
  setInterval(()=>{if(pageVisible())reload();else setVisibility();},25000);
  schedulePaint();
 }catch(e){console.error("Compass Program Status UI failed to initialize",e);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
