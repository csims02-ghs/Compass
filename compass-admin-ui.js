(()=>{
"use strict";
const OWNER_ID="68ded28a-24f6-44eb-a623-e12a5c76a3e0",cfg=window.COMPASS_CONFIG;
if(!cfg||!window.supabase)return;
const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
const el=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let assigned=[],staff=[],students=[],editing=null,mounted=false;
function setup(){
if(mounted)return;
const sidebar=el("sidebar"),main=document.querySelector("#app main.main");if(!sidebar||!main)return;
mounted=true;
const styles=document.createElement("style");styles.textContent=[
"#sidebar{overflow-y:auto!important;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#8eb0d3 transparent}",
"#sidebar .brand{margin-bottom:13px!important}#sidebar .side-label{margin:12px 12px 5px!important}",
"#sidebar .nav{gap:3px!important}#sidebar .nav button{min-height:38px!important;padding:8px 13px!important}",
".compass-tools{margin-top:12px}.compass-tools>summary{cursor:pointer;color:#fff;padding:12px 14px;border:1px solid #587ba7;border-radius:11px;font-weight:800;list-style:none;background:#ffffff12}",
".compass-tools>summary::-webkit-details-marker{display:none}.compass-tools>summary:after{content:'⌄';float:right}.compass-tools[open]>summary:after{content:'⌃'}",
".compass-tools>.nav{margin-top:7px;overflow:visible!important;max-height:none!important}",
"#page-admin-users .admin-columns{display:grid;grid-template-columns:minmax(270px,1fr) minmax(300px,1fr);gap:18px}",
"#page-admin-users .admin-panel{padding:22px}#page-admin-users label{display:block;font-weight:750;margin:10px 0;font-size:14px}",
"#page-admin-users label>.control{display:block;width:100%;margin-top:6px}",
"#page-admin-users .student-choices{max-height:260px;overflow:auto;border:1px solid #d5e1ec;border-radius:12px;padding:7px 12px;background:#f8fbff}",
"#page-admin-users .student-choices label{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #e5edf4;font-weight:600}",
"#page-admin-users .student-choices input{width:18px;height:18px;flex:none}",
"#page-admin-users .user-row{border-bottom:1px solid #dee8f4;padding:13px 0;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}",
"#page-admin-users .user-row small{display:block;color:#637d95;margin-top:4px}#page-admin-users .help{color:#647c96;font-size:13px;line-height:1.4}",
"#page-admin-users #adminMessage{margin:12px 0;font-size:14px;min-height:23px;color:#52718b}",
"#page-admin-users #adminMessage.error{color:#b1293d}#page-admin-users #adminMessage.ok{color:#147648}",
"@media(max-width:950px){#page-admin-users .admin-columns{grid-template-columns:1fr}}"
].join("\n");document.head.appendChild(styles);
const extra=document.createElement("details");extra.className="compass-tools";extra.id="compassAdditionalTools";
extra.innerHTML='<summary>Additional Tools</summary><nav class="nav" id="compassAdditionalNav"></nav>';
sidebar.insertBefore(extra,sidebar.querySelector(".side-foot"));
const nav=el("compassAdditionalNav");
["offline-programs","sessions","tasks","settings"].forEach(name=>{const button=sidebar.querySelector('.nav button[data-page="'+name+'"]');if(button)nav.appendChild(button)});
const button=document.createElement("button");button.type="button";button.dataset.page="admin-users";button.id="compassAdminNav";button.textContent="User Administration";nav.appendChild(button);
const page=document.createElement("section");page.id="page-admin-users";page.className="page";page.hidden=true;page.innerHTML=
'<div class="content"><div class="page-head"><div><h1>User Administration</h1><p class="subtitle">Invite staff, choose their email and assign a student caseload.</p></div></div>'+
'<div class="admin-columns"><article class="card admin-panel"><h2 id="adminFormHeading">Invite Staff</h2>'+
'<p class="help">Only the platform owner can invite staff. Staff set their own password using their invitation email.</p>'+
'<form id="adminForm"><label>Full name<input id="adminFullName" class="control" required minlength="2" maxlength="120"></label>'+
'<label>Email address<input id="adminEmail" type="email" class="control" required></label>'+
'<label>Role<select id="adminRole" class="control"><option value="rbt">RBT</option><option value="para">Paraprofessional</option><option value="teacher">Teacher</option><option value="bcba">BCBA</option></select></label>'+
'<label>Student caseload</label><div class="student-choices" id="adminStudents">Loading students…</div>'+
'<p class="help">Newly invited staff can access only students assigned here. You can adjust their caseload later.</p>'+
'<div class="button-row"><button class="btn primary" id="adminSubmit" type="submit">Send Invitation</button><button class="btn" id="adminCancel" type="button" hidden>Cancel Edit</button></div>'+
'<div id="adminMessage" role="status"></div></form></article>'+
'<article class="card admin-panel"><div class="panel-head"><h2>Staff Accounts</h2><button class="btn small" id="adminRefresh" type="button">Refresh</button></div>'+
'<div id="adminStaff">Loading staff…</div></article></div></div>';
main.appendChild(page);
button.addEventListener("click",()=>{extra.open=true;refresh()});
el("adminCancel").addEventListener("click",reset);
el("adminRefresh").addEventListener("click",refresh);
el("adminForm").addEventListener("submit",submit);
el("adminStudents").addEventListener("change",()=>{assigned=[...el("adminStudents").querySelectorAll("input:checked")].map(n=>n.value)});
el("adminStaff").addEventListener("click",async event=>{
 const edit=event.target.closest("[data-edit-id]"),toggle=event.target.closest("[data-toggle-id]");
 if(edit){const u=staff.find(s=>s.id===edit.dataset.editId);if(!u||!u.caseload_only)return;
 editing=u.id;assigned=[...u.student_ids];
 el("adminFormHeading").textContent="Edit Caseload";el("adminFullName").value=u.full_name||"";el("adminEmail").value=u.email||"";el("adminRole").value=u.role;
 ["adminFullName","adminEmail","adminRole"].forEach(id=>el(id).disabled=true);
 el("adminSubmit").textContent="Save Caseload";el("adminCancel").hidden=false;renderStudents();el("adminFormHeading").scrollIntoView({behavior:"smooth",block:"start"});}
 if(toggle){const u=staff.find(s=>s.id===toggle.dataset.toggleId);if(!u||!u.caseload_only)return;
 if(!confirm((u.active?"Disable":"Enable")+" access for "+u.email+"?"))return;
 try{const r=await api({action:"set_active",user_id:u.id,active:!u.active});message(r.message,"ok");await refresh()}catch(e){message(e.message,"error")}}
});
}
function message(msg,cls=""){const x=el("adminMessage");if(!x)return;x.textContent=msg||"";x.className=cls;}
async function api(payload){
 const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw Error("Please sign in again.");
 const {data,error}=await sb.functions.invoke("compass-admin-users",{body:payload});
 if(error){let d;try{d=await error.context.json()}catch(_){}throw Error(d?.error||error.message||"Unable to complete the request.")}
 if(data?.error)throw Error(data.error);
 return data;
}
function renderStudents(){
 const n=el("adminStudents");if(!n)return;
 n.innerHTML=students.length?students.map(s=>
 '<label><input type="checkbox" value="'+esc(s.id)+'" '+(assigned.includes(s.id)?"checked":"")+'><span>'+esc(s.display_label||s.student_code||"Student")+' <small class="help">'+esc(s.grade_level||"")+'</small></span></label>'
 ).join(""):"No students available.";
}
function renderStaff(){
 const n=el("adminStaff");if(!n)return;
 n.innerHTML=staff.length?staff.map(u=>
 '<div class="user-row"><div><strong>'+esc(u.full_name||u.email)+'</strong><small>'+esc(u.email)+' · '+esc(u.role.toUpperCase())+' · '+(u.active?"Active":"Disabled")+'</small><small>'+ (u.caseload_only?u.student_ids.length+" assigned student(s)":"Existing classroom-based staff") +'</small></div><div class="button-row">'+
 '<button class="btn small" data-edit-id="'+esc(u.id)+'" '+(u.caseload_only?"":"disabled")+'>Caseload</button>'+
 (u.caseload_only?'<button class="btn small" data-toggle-id="'+esc(u.id)+'">'+(u.active?"Disable":"Enable")+'</button>':"")+
 '</div></div>'
 ).join(""):"No staff accounts yet.";
}
async function refresh(){try{const d=await api({action:"list"});staff=d.staff||[];students=d.students||[];renderStudents();renderStaff()}catch(e){message(e.message,"error")}}
function reset(){
 editing=null;assigned=[];el("adminForm").reset();
 ["adminFullName","adminEmail","adminRole"].forEach(id=>el(id).disabled=false);
 el("adminFormHeading").textContent="Invite Staff";el("adminSubmit").textContent="Send Invitation";el("adminCancel").hidden=true;renderStudents();
}
async function submit(event){
 event.preventDefault();const btn=el("adminSubmit");btn.disabled=true;message(editing?"Saving caseload…":"Sending invitation…");
 try{
 const response=editing?await api({action:"assign",user_id:editing,student_ids:assigned}):
 await api({action:"invite",full_name:el("adminFullName").value.trim(),email:el("adminEmail").value.trim(),role:el("adminRole").value,student_ids:assigned});
 reset();message(response.message||"Saved.","ok");await refresh();
 }catch(e){message(e.message,"error")}finally{btn.disabled=false}
}
async function gate(){
 const {data:{user}}=await sb.auth.getUser();if(!user||user.id!==OWNER_ID)return;
 const {data:profile}=await sb.from("profiles").select("role,active").eq("id",user.id).maybeSingle();
 if(profile?.role==="platform_admin"&&profile.active===true){setup();if(location.hash==="#admin-users")refresh()}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>gate(),{once:true});else gate();
sb.auth.onAuthStateChange(event=>{if(event==="SIGNED_IN")gate()});
})();