/* COMPASS program administration — platform-admin-only UI.
 * All hold writes and held-runner reads are checked by Supabase Edge Functions.
 */
(function(){
"use strict";
const URL_ROOT="https://ykkexfsbnnxgncnyaksr.supabase.co";
const KEY="sb_publishable_3qkWcBut_bVwI6mlhOQOzA_50z_46cY";
const STATUS_URL=URL_ROOT+"/functions/v1/compass-admin-program-status";
const RUNNER_URL=URL_ROOT+"/functions/v1/compass-program-runner";
let api=null,session=null,isAdmin=false,catalog=[],mounted=null,previewBlob=null,working=false;
const el=id=>document.getElementById(id);
const lifecycle=p=>p?.program_config?.lifecycle_status==="on_hold"?"on_hold":"active";
const notify=(msg,bad=false)=>{const box=el("compassProgramAdminFeedback");if(box){box.textContent=msg;box.style.color=bad?"#a52c31":"#176345";}};
function currentPage(){
 let p=document.querySelector("#page-programs,#page-programming,#page-program-library,#page-program-bank");
 if(p&&p.offsetParent!==null)return p;
 const active=document.querySelector(".page.active,.page:not([hidden])[style*='block'],[data-page-view='programs']");
 if(active&&/\bprograms\b/i.test(active.querySelector("h1,h2")?.textContent||""))return active;
 const nav=[...document.querySelectorAll("button[data-page],a[data-page]")].find(x=>String(x.getAttribute("data-page")||"").toLowerCase()==="programs"&&x.matches(".active,[aria-current='page'],.selected"));
 if(nav){const p=document.querySelector("#page-programs");if(p)return p;}
 return null;
}
function styles(){
 if(el("compassProgramAdminCss"))return;
 const st=document.createElement("style");st.id="compassProgramAdminCss";
 st.textContent=`
.compass-pa-toolbar{display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin:8px 0 16px;background:#fff;border:1px solid #dbe6f2;border-radius:12px;padding:12px 16px;color:#17365d}
.compass-pa-toolbar h3{margin:0 0 3px;font-size:15px}.compass-pa-toolbar p{margin:0;color:#64748b;font-size:12px;line-height:1.45}
.compass-pa-btn{min-height:43px;border-radius:9px;padding:10px 15px;border:1px solid #bbd2e8;background:#176bd0;color:#fff;font-weight:800;cursor:pointer}
.compass-pa-pill{display:inline-block;padding:5px 10px;margin-left:7px;background:#fff2d8;color:#80590e;border:1px solid #e8c77f;border-radius:20px;font-size:11px;font-weight:800}
.compass-pa-dialog{border:1px solid #d5e3f2;border-radius:16px;width:min(610px,calc(100vw - 25px));max-height:90dvh;padding:0;color:#17365d;box-shadow:0 25px 70px #12334b55}
.compass-pa-dialog::backdrop{background:#102b48ac}
.compass-pa-content{padding:20px;display:grid;gap:13px;font:14px/1.4 Arial,Helvetica,sans-serif}
.compass-pa-content h2{margin:0;font-size:21px}.compass-pa-content label{font-size:12px;font-weight:800}
.compass-pa-content select{display:block;width:100%;margin-top:5px;border:1px solid #bdcee0;border-radius:8px;padding:11px;color:#17365d;background:#fff;min-height:44px;font:inherit}
.compass-pa-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:9px}
.compass-pa-actions button{padding:11px 14px;border:1px solid #b9cfe3;border-radius:9px;background:white;color:#175e9d;min-height:43px;font-weight:800;cursor:pointer}
.compass-pa-actions button.primary{background:#176bd0;color:white;border-color:#176bd0}
.compass-pa-actions button:disabled{opacity:.45;cursor:default}
.compass-pa-preview{width:min(1040px,calc(100vw - 25px));height:min(850px,calc(100dvh - 28px));max-height:95dvh}
.compass-pa-preview .compass-pa-content{height:100%;grid-template-rows:auto minmax(0,1fr)}
.compass-pa-preview iframe{width:100%;height:100%;min-height:290px;border:1px solid #d7e5f3;border-radius:8px}
`;
 document.head.appendChild(st);
}
function selected(){return catalog.find(x=>x.program_code===el("compassPaProgram")?.value)||null;}
function selectedStatus(){
 const p=selected(),box=el("compassPaCurrent");
 if(box)box.textContent=p?"Current status: "+(lifecycle(p)==="on_hold"?"On Hold":"Active"):"";
 if(p)el("compassPaStatus").value=lifecycle(p);
}
function populate(){
 const list=el("compassPaProgram");if(!list)return;
 const selectedCode=list.value;list.replaceChildren();
 for(const p of catalog){const o=new Option(p.program_name+(lifecycle(p)==="on_hold"?" — On Hold":""),p.program_code);list.add(o);}
 if(catalog.some(p=>p.program_code===selectedCode))list.value=selectedCode;
 selectedStatus();
}
function summary(){
 const held=catalog.filter(p=>lifecycle(p)==="on_hold");
 const box=el("compassPaSummary");if(box){box.textContent=catalog.length+" Programs · "+held.length+" On Hold";
 if(held.length){const n=document.createElement("span");n.className="compass-pa-pill";n.textContent="On Hold: "+held.slice(0,3).map(x=>x.program_name).join(", ")+(held.length>3?" +"+(held.length-3)+" more":"");box.appendChild(n);}}
}
async function refresh(){
 const {data,error}=await api.from("compass_programming_programs").select("id,program_code,program_name,program_config,active").eq("active",true).order("program_name");
 if(error)throw new Error(error.message);
 catalog=data||[];populate();summary();
}
function setupDom(){
 if(el("compassPaDialog"))return;
 styles();
 const dialog=document.createElement("dialog");dialog.id="compassPaDialog";dialog.className="compass-pa-dialog";
 dialog.innerHTML=`<form class="compass-pa-content" id="compassPaForm"><h2>Edit Program</h2><div style="font-size:12px;color:#64748b">Only Compass platform admins can change availability.</div>
 <label>Select program<select id="compassPaProgram" required></select></label>
 <label>Program status<select id="compassPaStatus"><option value="active">Active — available to staff</option><option value="on_hold">On Hold — platform admin only</option></select></label>
 <div id="compassPaCurrent" style="font-weight:bold"></div>
 <p style="color:#64748b;margin:0">On Hold blocks opening the entire program through the catalog and student runtime links, without deleting its targets, data or assignments.</p>
 <div id="compassProgramAdminFeedback" role="status" aria-live="polite" style="min-height:18px;font-size:12px"></div>
 <div class="compass-pa-actions"><button type="button" id="compassPaPreview">Open Program (Admin)</button><button type="button" id="compassPaCancel">Cancel</button><button type="submit" id="compassPaSave" class="primary">Save Status</button></div></form>`;
 const pd=document.createElement("dialog");pd.id="compassPaPreviewDialog";pd.className="compass-pa-dialog compass-pa-preview";
 pd.innerHTML=`<div class="compass-pa-content"><div class="compass-pa-actions" style="align-items:center;justify-content:space-between"><b id="compassPaPreviewTitle">Compass Program Preview</b><button type="button" id="compassPaPreviewClose">Close</button></div><iframe id="compassPaPreviewFrame" title="Compass Admin Program Preview"></iframe></div>`;
 document.body.append(dialog,pd);
 el("compassPaProgram").addEventListener("change",selectedStatus);
 el("compassPaCancel").onclick=()=>dialog.close();
 el("compassPaPreviewClose").onclick=()=>pd.close();
 pd.addEventListener("close",()=>{el("compassPaPreviewFrame").removeAttribute("src");if(previewBlob){URL.revokeObjectURL(previewBlob);previewBlob=null;}});
 el("compassPaForm").addEventListener("submit",async e=>{
  e.preventDefault();if(working||!isAdmin)return;const p=selected();if(!p)return;
  const value=el("compassPaStatus").value;
  if(value===lifecycle(p)){notify("Already "+(value==="on_hold"?"On Hold":"Active")+".");return;}
  working=true;el("compassPaSave").disabled=true;notify("Saving program status…");
  try{
   const {data:{session:current}}=await api.auth.getSession();
   if(!current?.access_token)throw Error("Please sign in again.");
   const r=await fetch(STATUS_URL,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+current.access_token,apikey:KEY},body:JSON.stringify({program_code:p.program_code,status:value})});
   const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||"Status change failed.");
   p.program_config={...(p.program_config||{}),lifecycle_status:data.status};
   populate();summary();notify(data.program_name+" is now "+(data.status==="on_hold"?"On Hold":"Active")+".");
  }catch(error){notify(error.message||"Could not save.",true);}
  finally{working=false;el("compassPaSave").disabled=false;}
 });
 el("compassPaPreview").addEventListener("click",async ()=>{
  const p=selected();if(!p||!isAdmin)return;notify("Opening secure admin preview…");
  try{
   const {data:{session:current}}=await api.auth.getSession();
   if(!current?.access_token)throw Error("Sign in required.");
   const response=await fetch(RUNNER_URL+"?program_code="+encodeURIComponent(p.program_code),{cache:"no-store",headers:{Authorization:"Bearer "+current.access_token,apikey:KEY}});
   if(!response.ok){const err=await response.json().catch(()=>({}));throw Error(err.error||"Program unavailable");}
   previewBlob=URL.createObjectURL(new Blob([await response.text()],{type:"text/html;charset=utf-8"}));
   el("compassPaPreviewTitle").textContent=p.program_name+(lifecycle(p)==="on_hold"?" · On Hold":"");
   el("compassPaPreviewFrame").src=previewBlob;pd.showModal();notify("Admin preview opened.");
  }catch(e){notify(e.message||"Could not open preview.",true);}
 });
}
async function mount(){
 if(!isAdmin)return;
 const page=currentPage();if(!page||mounted===page)return;
 setupDom();
 const t=document.createElement("div");t.className="compass-pa-toolbar";t.id="compass-pa-toolbar";
 const copy=document.createElement("div"),h=document.createElement("h3"),p=document.createElement("p");h.textContent="Program Management";p.id="compassPaSummary";p.textContent="Loading program statuses…";copy.append(h,p);
 const btn=document.createElement("button");btn.className="compass-pa-btn";btn.type="button";btn.textContent="✎ Edit Program";btn.onclick=()=>{el("compassPaDialog").showModal();refresh().catch(e=>notify(e.message||"Unable to load programs.",true));};
 t.append(copy,btn);page.insertBefore(t,page.firstChild);mounted=page;summary();
}
async function init(){
 if(!window.supabase?.createClient)return;
 try{api=window.supabase.createClient(URL_ROOT,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const {data:{session:s}}=await api.auth.getSession();if(!s?.user)return;session=s;
  const {data:p}=await api.from("profiles").select("role,active").eq("id",s.user.id).maybeSingle();
  if(!p?.active||p.role!=="platform_admin")return;isAdmin=true;
  await refresh();
  mount();
  let queued=false;const observer=new MutationObserver(()=>{if(!queued){queued=true;setTimeout(()=>{queued=false;mount();},200);}});
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener("click",()=>setTimeout(mount,0),true);
 }catch(e){console.warn("COMPASS admin edit program unavailable",e);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
