from pathlib import Path
import base64
import gzip

INDEX = Path('index.html')
SW = Path('sw.js')
TAG = 'COMPASS IEP goal persistence v1'

s = INDEX.read_text()

# Confirm the immutable bundled release still has the exact application code this patch targets.
parts = [
    'part01.txt','part02.txt','part03.txt','part04a.txt','part04b.txt','part04c.txt',
    'part05.txt','part06.txt','part07.txt','part08a.txt','part08b.txt','part08c.txt',
    'part09a.txt','part09b.txt','part09c.txt','part10a.txt','part10b.txt'
]
blob = b''.join(
    base64.b64decode(''.join(Path('release/v20261010-3', name).read_text().split()))
    for name in parts
)
base_html = gzip.decompress(blob).decode()

old_goal_save = '''let id=goal?.id;if(id){const {error}=await sb.from('student_iep_goals').update(payload).eq('id',id);if(error){toast(error.message,'error');return}const {error:de}=await sb.from('student_iep_goal_compass_programs').delete().eq('goal_id',id);if(de){toast(de.message,'error');return}}else{const {data,error}=await sb.from('student_iep_goals').insert(payload).select('id').single();if(error){toast(error.message,'error');return}id=data.id}const sel=qsa('input[name="goalProgram"]:checked',$('goalForm')).map(x=>x.value);if(sel.length){const {error}=await sb.from('student_iep_goal_compass_programs').insert(sel.map(sp=>({goal_id:id,student_compass_program_id:sp})));if(error){toast(error.message,'error');return}}closeModal();toast('IEP goal saved.');await loadStudentProfile();await loadGlobalData()'''

if base_html.count('async function loadStudentProfile(){') != 1:
    raise SystemExit('Base release profile loader anchor changed')
if base_html.count(old_goal_save) != 1:
    raise SystemExit('Base release goal-save anchor changed')

if TAG not in s:
    marker = "  const listFnStart=html.indexOf('function openCreateProgramList(list=null){');"
    if s.count(marker) != 1:
        raise SystemExit('index insertion marker missing or duplicated')

    block = r'''  // COMPASS IEP goal persistence v1
  const profileLoadStart=html.indexOf('async function loadStudentProfile(){');
  const profileLoadEnd=html.indexOf('async function loadTeam()',profileLoadStart);
  if(profileLoadStart<0||profileLoadEnd<0)throw new Error('COMPASS IEP goal persistence check failed: profile loader not found');
  const profileLoadReplacement=`let studentProfileLoadSeq=0;
  async function loadStudentProfile(){
    const s=state.currentStudent;if(!s)return;
    const sid=s.id,seq=++studentProfileLoadSeq;
    const priorPrograms=(Array.isArray(state.studentPrograms)?state.studentPrograms:[]).filter(x=>x.student_id===sid);
    const priorGoals=(Array.isArray(state.goals)?state.goals:[]).filter(x=>x.student_id===sid);
    const priorNotes=(Array.isArray(state.notes)?state.notes:[]).filter(x=>x.student_id===sid);
    const priorDocs=(Array.isArray(state.documents)?state.documents:[]).filter(x=>x.student_id===sid);
    const priorAssessments=(Array.isArray(state.assessments)?state.assessments:[]).filter(x=>x.student_id===sid);
    const priorServices=(Array.isArray(state.services)?state.services:[]).filter(x=>x.student_id===sid);
    const priorLogs=(Array.isArray(state.serviceLogs)?state.serviceLogs:[]).filter(x=>x.student_id===sid);
    const grab=async fn=>{try{return await fn()}catch(error){return{data:null,error}}};
    const take=(r,prior,label)=>{if(r&&r.error){console.warn('COMPASS profile reload failed: '+label,r.error);return prior}return Array.isArray(r?.data)?r.data:prior};
    const [programRes,goalRes,noteRes,docRes,assessmentRes,serviceRes,logRes]=await Promise.all([
      grab(()=>sb.from('student_compass_programs').select('*').eq('student_id',sid).order('display_order')),
      grab(()=>sb.from('student_iep_goals').select('*').eq('student_id',sid).order('created_at',{ascending:false})),
      grab(()=>sb.from('student_notes').select('*').eq('student_id',sid).order('note_date',{ascending:false}).order('created_at',{ascending:false})),
      grab(()=>sb.from('student_documents').select('*').eq('student_id',sid).order('created_at',{ascending:false})),
      grab(()=>sb.from('student_assessments').select('*').eq('student_id',sid).order('updated_at',{ascending:false})),
      grab(()=>sb.from('student_service_requirements').select('*').eq('student_id',sid).eq('active',true).order('service_name')),
      grab(()=>sb.from('service_delivery_logs').select('*').eq('student_id',sid).order('service_date',{ascending:false}).limit(100))
    ]);
    if(seq!==studentProfileLoadSeq||state.currentStudent?.id!==sid)return;
    const programs=take(programRes,priorPrograms,'programs'),goals=take(goalRes,priorGoals,'IEP goals'),notes=take(noteRes,priorNotes,'notes'),docs=take(docRes,priorDocs,'documents'),assessments=take(assessmentRes,priorAssessments,'assessments'),services=take(serviceRes,priorServices,'services'),logs=take(logRes,priorLogs,'service logs');
    Object.assign(state,{studentPrograms:programs,goals,notes,documents:docs,assessments,services,serviceLogs:logs});
    const ids=programs.map(x=>x.id),programIdSet=new Set(ids),priorSessions=(Array.isArray(state.sessions)?state.sessions:[]).filter(x=>programIdSet.has(x.student_compass_program_id));
    const sessionRes=ids.length?await grab(()=>sb.from('compass_program_sessions').select('*').in('student_compass_program_id',ids).order('session_date').order('created_at')):{data:[],error:null};
    if(seq!==studentProfileLoadSeq||state.currentStudent?.id!==sid)return;
    state.sessions=take(sessionRes,priorSessions,'sessions');
    const gids=goals.map(x=>x.id),goalIdSet=new Set(gids),priorLinks=(Array.isArray(state.goalLinks)?state.goalLinks:[]).filter(x=>goalIdSet.has(x.goal_id));
    const linkRes=gids.length?await grab(()=>sb.from('student_iep_goal_compass_programs').select('*').in('goal_id',gids)):{data:[],error:null};
    if(seq!==studentProfileLoadSeq||state.currentStudent?.id!==sid)return;
    state.goalLinks=take(linkRes,priorLinks,'IEP goal links');
    await loadTeam();
    if(seq!==studentProfileLoadSeq||state.currentStudent?.id!==sid)return;
    renderStudentProfile();
    await loadProgramLists();
  }
  `;
  html=html.slice(0,profileLoadStart)+profileLoadReplacement+html.slice(profileLoadEnd);

  const oldGoalSave=`let id=goal?.id;if(id){const {error}=await sb.from('student_iep_goals').update(payload).eq('id',id);if(error){toast(error.message,'error');return}const {error:de}=await sb.from('student_iep_goal_compass_programs').delete().eq('goal_id',id);if(de){toast(de.message,'error');return}}else{const {data,error}=await sb.from('student_iep_goals').insert(payload).select('id').single();if(error){toast(error.message,'error');return}id=data.id}const sel=qsa('input[name="goalProgram"]:checked',$('goalForm')).map(x=>x.value);if(sel.length){const {error}=await sb.from('student_iep_goal_compass_programs').insert(sel.map(sp=>({goal_id:id,student_compass_program_id:sp})));if(error){toast(error.message,'error');return}}closeModal();toast('IEP goal saved.');await loadStudentProfile();await loadGlobalData()`;
  const newGoalSave=`let id=goal?.id,savedGoal=null;if(id){const {data,error}=await sb.from('student_iep_goals').update(payload).eq('id',id).select('*').single();if(error){toast(error.message,'error');return}savedGoal=data;const {error:de}=await sb.from('student_iep_goal_compass_programs').delete().eq('goal_id',id);if(de){toast(de.message,'error');return}}else{const {data,error}=await sb.from('student_iep_goals').insert(payload).select('*').single();if(error){toast(error.message,'error');return}savedGoal=data;id=data.id}const sel=qsa('input[name="goalProgram"]:checked',$('goalForm')).map(x=>x.value),linkRows=sel.map(sp=>({goal_id:id,student_compass_program_id:sp}));if(linkRows.length){const {error}=await sb.from('student_iep_goal_compass_programs').insert(linkRows);if(error){toast(error.message,'error');return}}closeModal();if(savedGoal&&state.currentStudent?.id===payload.student_id){state.goals=[savedGoal,...(Array.isArray(state.goals)?state.goals:[]).filter(g=>g.id!==id&&g.student_id===payload.student_id)].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));state.goalLinks=[...(Array.isArray(state.goalLinks)?state.goalLinks:[]).filter(l=>l.goal_id!==id),...linkRows];renderStudentProfile()}toast('IEP goal saved.');await loadStudentProfile();if(savedGoal&&state.currentStudent?.id===payload.student_id&&!state.goals.some(g=>g.id===id)){state.goals=[savedGoal,...state.goals.filter(g=>g.id!==id)];state.goalLinks=[...state.goalLinks.filter(l=>l.goal_id!==id),...linkRows];renderStudentProfile()}await loadGlobalData()`;
  if(html.split(oldGoalSave).length!==2)throw new Error('COMPASS IEP goal persistence check failed: goal save handler not found exactly once');
  html=html.replace(oldGoalSave,newGoalSave);

'''
    s = s.replace(marker, block + marker)
    INDEX.write_text(s)

# Always make the cache bump idempotent.
w = SW.read_text()
if "const CACHE='compass-shell-v24'" in w:
    w = w.replace("const CACHE='compass-shell-v24'", "const CACHE='compass-shell-v25'", 1)
elif "const CACHE='compass-shell-v25'" not in w:
    raise SystemExit('Unexpected service worker cache version')
SW.write_text(w)

# Final static checks.
s = INDEX.read_text()
for needle in [TAG, 'studentProfileLoadSeq', 'profileLoadReplacement', 'newGoalSave', ".select('*').single()"]:
    if needle not in s:
        raise SystemExit(f'Missing expected IEP persistence patch: {needle}')
if "const CACHE='compass-shell-v25'" not in SW.read_text():
    raise SystemExit('Service worker cache was not bumped to v25')
print('IEP goal persistence patch: PASS')
