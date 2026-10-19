import { createClient } from "npm:@supabase/supabase-js@2";
const PROJECT_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const PUB_KEY=Deno.env.get("SUPABASE_ANON_KEY")||"";
const OWNER_ID="68ded28a-24f6-44eb-a623-e12a5c76a3e0";
const LIVE_ORIGIN="https://csims02-ghs.github.io";
const ALLOWED_ROLES=new Set(["bcba","teacher","rbt","para"]);
const admin=createClient(PROJECT_URL,SERVICE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
function respond(body:unknown,status=200,origin=LIVE_ORIGIN){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","access-control-allow-origin":origin,"vary":"Origin","cache-control":"no-store"}})}
function fail(error:string,status=400,origin=LIVE_ORIGIN){return respond({error},status,origin)}
function validEmail(v:unknown){return typeof v==="string"&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254}
function validIds(v:unknown){return Array.isArray(v)&&v.length<=200&&v.every(x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(x))}
async function verifyAssignments(ids:string[]){if(!ids.length)return;const {data,error}=await admin.from("students").select("id").in("id",ids);if(error)throw error;if((data||[]).length!==ids.length)throw new Error("One or more selected students are invalid.")}
async function setAssignments(uid:string,studentIds:string[]){
 const ids=[...new Set(studentIds)];await verifyAssignments(ids);
 const {data:existing,error:lookupError}=await admin.from("provider_caseloads").select("id,student_id,status").eq("provider_user_id",uid);
 if(lookupError)throw lookupError;
 const removed=(existing||[]).filter(x=>!ids.includes(x.student_id)&&x.status==="active").map(x=>x.id);
 if(removed.length){const {error}=await admin.from("provider_caseloads").update({status:"inactive",end_date:new Date().toISOString().slice(0,10)}).in("id",removed);if(error)throw error;}
 if(ids.length){
   const rows=ids.map(student_id=>({provider_user_id:uid,student_id,status:"active",end_date:null}));
   const {error}=await admin.from("provider_caseloads").upsert(rows,{onConflict:"provider_user_id,student_id"});if(error)throw error;
 }
 return ids.length;
}
async function users(){
 const profilesRes=await admin.from("profiles").select("id,full_name,role,active,caseload_only").neq("role","platform_admin").order("full_name");
 if(profilesRes.error)throw profilesRes.error;
 const {data:authUsers,error:authError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
 if(authError)throw authError;
 const emails=new Map((authUsers.users||[]).map(u=>[u.id,u.email||""]));
 const ids=(profilesRes.data||[]).map(p=>p.id);
 const {data:assignments,error:aErr}=await admin.from("provider_caseloads").select("provider_user_id,student_id,status").in("provider_user_id",ids.length?ids:["00000000-0000-0000-0000-000000000000"]);
 if(aErr)throw aErr;
 const staff=(profilesRes.data||[]).map(p=>({...p,email:emails.get(p.id)||"",student_ids:(assignments||[]).filter(x=>x.provider_user_id===p.id&&x.status==="active").map(x=>x.student_id)}));
 const {data:students,error:sErr}=await admin.from("students").select("id,display_label,student_code,grade_level").order("display_label");
 if(sErr)throw sErr;
 return {staff,students};
}
Deno.serve(async request=>{
 const origin=request.headers.get("origin")||LIVE_ORIGIN;
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":origin===LIVE_ORIGIN?origin:LIVE_ORIGIN,"access-control-allow-headers":"authorization, apikey, x-client-info, content-type","access-control-allow-methods":"POST,OPTIONS","vary":"Origin"}});
 if(request.method!=="POST")return fail("Method not allowed.",405);
 if(origin!==LIVE_ORIGIN)return fail("Origin not allowed.",403);
 if(!PROJECT_URL||!SERVICE_KEY||!PUB_KEY)return fail("Administration is not configured.",503);
 try{
   const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
   if(!token)return fail("Please sign in.",401);
   const sessionClient=createClient(PROJECT_URL,PUB_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data:identity,error:authError}=await sessionClient.auth.getUser(token);
   if(authError||!identity.user)return fail("Your sign-in has expired. Sign in again.",401);
   if(identity.user.id!==OWNER_ID)return fail("Only the designated COMPASS platform owner can manage users.",403);
   const {data:profile,error:profileErr}=await admin.from("profiles").select("role,active").eq("id",identity.user.id).maybeSingle();
   if(profileErr||profile?.role!=="platform_admin"||profile?.active!==true)return fail("Administration access denied.",403);
   const input=await request.json().catch(()=>({}));
   if(input.action==="list")return respond(await users());
   if(input.action==="invite"){
     const email=String(input.email||"").trim().toLowerCase(),name=String(input.full_name||"").trim(),role=String(input.role||"");
     const studentIds=input.student_ids||[];
     if(!validEmail(email)||name.length<2||name.length>120||!ALLOWED_ROLES.has(role)||!validIds(studentIds))return fail("Enter a valid name, email, staff role and student selection.");
     await verifyAssignments([...new Set(studentIds)]);
     const {data:existingAuth,error:readError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
     if(readError)throw readError;
     if((existingAuth.users||[]).some(u=>(u.email||"").toLowerCase()===email))return fail("This email already has a COMPASS login. Choose the user from the staff list instead.",409);
     const {data:invitation,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:"https://csims02-ghs.github.io/Compass/invite.html",data:{full_name:name}});
     if(inviteError)return fail(inviteError.message,inviteError.status===429?429:400);
     const uid=invitation.user?.id;if(!uid)return fail("Supabase did not return a staff account.",502);
     const {error:createError}=await admin.from("profiles").upsert({id:uid,full_name:name,role,active:true,caseload_only:true,school_id:null},{onConflict:"id"});
     if(createError)return fail("Invitation sent but COMPASS profile setup was incomplete. Contact the platform owner.",500);
     try{await setAssignments(uid,studentIds);return respond({ok:true,message:"Invitation sent and caseload assigned.",id:uid});}
     catch(e){return fail("Invitation sent, but caseload assignment needs review: "+String(e?.message||e),500);}
   }
   if(input.action==="assign"){
     const uid=String(input.user_id||"");const studentIds=input.student_ids||[];
     if(uid===OWNER_ID||!validIds(studentIds))return fail("Invalid staff or student selection.");
     const {data:target,error:targetErr}=await admin.from("profiles").select("role,caseload_only,active").eq("id",uid).maybeSingle();
     if(targetErr||!target||target.role==="platform_admin")return fail("This staff member cannot be edited.",403);
     if(!target.caseload_only)return fail("Existing classroom-based staff must be migrated to caseload-only access before changing their scope.",409);
     const count=await setAssignments(uid,studentIds);
     return respond({ok:true,message:"Caseload updated.",count});
   }
   if(input.action==="set_active"){
     const uid=String(input.user_id||"");if(uid===OWNER_ID)return fail("Owner account cannot be changed.",403);
     const {data:target}=await admin.from("profiles").select("role,caseload_only").eq("id",uid).maybeSingle();
     if(!target||target.role==="platform_admin"||!target.caseload_only)return fail("Only caseload-only staff can be changed.",403);
     const active=input.active===true;
     const {error}=await admin.from("profiles").update({active}).eq("id",uid);if(error)throw error;
     return respond({ok:true,message:active?"User access enabled.":"User access disabled."});
   }
   return fail("Unsupported action.");
 }catch(e){return fail("User management request failed: "+String(e?.message||e),500);}
});