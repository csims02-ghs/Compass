#!/usr/bin/env node
// Protect the actual published COMPASS shell from obsolete caseload builds.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const shell=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const segment=(start,end)=>{
  const a=shell.indexOf(start),b=shell.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'Missing or invalid COMPASS section boundaries: '+start);
  return shell.slice(a,b);
};
const casePage=segment('<section id="page-caseload"','<section id="page-students"');
const metricNames=['Assigned Students','Upcoming Reviews','Assessments in Progress','Active Student Plans'];
const metricIds=['caseTotal','caseReviews','caseAssessments','casePlans'];
for(const label of metricNames)assert(casePage.includes('>'+label+'</span>'),'Missing case metric: '+label);
for(const id of metricIds)assert.equal((casePage.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Metric duplicated or missing: '+id);
for(const old of ['Total Students','Active Services','Sessions Today','Needs Attention','id="caseServices"','id="caseSessionsToday"','id="caseAttention"'])assert(!casePage.includes(old),'Stale caseload card: '+old);
assert.equal((shell.match(/id="page-caseload"/g)||[]).length,1,'Duplicate caseload screen');
assert.equal((shell.match(/id="sidebar"/g)||[]).length,1,'Duplicate navigation shell');
assert.equal((shell.match(/id="compass-caseload-dashboard-20261025"/g)||[]).length,1,'Duplicate/missing caseload stylesheet');
assert.equal((casePage.match(/data-action="open-caseload-add"/g)||[]).length,1,'Add Student action must appear once on My Caseload');
assert(casePage.indexOf('id="caseloadSearch"')<casePage.indexOf('class="caseload-action-row"'),'Add Student must be below search and filters');
assert(casePage.includes('id="caseloadBody"'),'Student table missing');
assert(!casePage.includes('data-case-sort="programs"'),'Programs table column must be removed from My Caseload');
assert(!casePage.includes('id="caseProgramFilter"'),'Programs filter must not appear in My Caseload');
assert.equal((casePage.match(/<th>/g)||[]).length,8,'My Caseload must have eight table columns');
assert(shell.includes("readRows('student_compass_programs'"),'Program assignments remain available for target and prompt calculations');
assert(shell.includes('data-case-sort="prompt"')&&shell.includes('data-case-sort="mastered"'),'Prompt and mastery columns must remain');

assert(shell.includes('aria-label="Open student profile">Profile</button>'),'Profile-only button missing');
assert(!shell.includes('id="review-only"'),'Unsafe old review-only patch shipped');
assert(!shell.includes('Loading COMPASS 1/'),'Obsolete nested runtime loader shipped');
assert(shell.includes('async function updateCaseloadInsights(){'),'Caseload metrics loader missing');
assert(shell.includes("await updateCaseloadInsights();"),'Caseload metrics not refreshed by loadHome');
const tables=[...shell.matchAll(/<style\b[^>]*\bid=["']([^"']+)/gi)].map(m=>m[1]);
assert.equal(new Set(tables).size,tables.length,'Duplicate CSS patch IDs in COMPASS shell');
console.log('CASELOAD_SHELL_REGRESSION_PASS',JSON.stringify({cards:metricNames,oneSidebar:true,oneCaseload:true,oneAssignmentAction:true,profileOnly:true,uniqueStyles:tables.length}));
