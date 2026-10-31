# COMPASS WH Concepts — Mixed and Focused WH Questions

Release date: October 31, 2026. Program: `CP-WH-CONCEPTS`.

## User-facing functionality

WH Concepts now supports two setup modes:

- **Mixed WH — Several questions per story (default):** each scored step uses a different, meaningful question from the selected story rather than repeating the same canonical question. Questions rotate by WH type and move to another story if a chain requires more distinct questions than the current story provides.
- **Focus on one WH — Rotate stories:** staff selects WHO, WHAT, WHERE, WHEN, WHY, HOW, WHICH, or WHOSE. Each step stays within that WH category but uses a new question/story when possible. For Maya's story, WHAT includes two distinct available prompts before advancing: `What does Maya complete?` and `What color was Maya's notebook?`.
- Existing **Array Size N/A or 3**, **Grade K–8**, **Scaffolding Levels 1–4**, **4 benchmark tabs**, **DTI and IEP chains**, 70/30 two-screen layout, behavior tracking, and staff-controlled scores are unchanged.
- The target selector now labels the *story* rather than showing only a question that may not be presented during a mixed run.

## Grounded question bank

25 original story contexts × 8 authored WH categories = **200** original WH prompts. An additional, text-supported detail question about Maya's blue notebook was added as `extra_qa` on story 1, so **201 distinct story prompts** are available across each grade track. This does **not** mean 201 new master targets: the original 900 grade/benchmark/story target rows are preserved, and question identities are recorded as subquestions under the original target keys.

The new question key follows `<base target key>:<WH question ID>` such as `WH-K-01-01:WHAT_COLOR_NOTEBOOK`. Each trial in the saved session's `source_record.v25_run.wh_questions` carries its own question key, WH type, question text, story ID, and score; the per-trial `target_name` is the actual displayed question, while the canonical `target_key` remains the assigned story target. **Per-W dashboards and analytics have not been separately certified; do not infer new mastery targets from these subquestion identities.**

## Grade-specific probes

The prior generic V25 benchmark metadata did not describe which of the 900 master targets belongs to an individual-grade full benchmark probe. It is now replaced with **36** grade × benchmark definitions, each with **25** member display orders and a unique key such as `WH-K-B1`. The runner sends that key and a descriptive `benchmark_name` (Mixed WH or Focused WHO, etc.). The probe still scores exactly 25 canonical story target identities and is separate from teaching mastery.

## Tests performed

The Chrome stress suite `scripts/test-wh-multi-question-v25.cjs` passed at 1024×768 and 1440×900, covering:
- 38/38 shared structural V25 IDs present and original 70/30 layout with no horizontal overflow;
- 900 untouched unique master target keys, 25 story contexts, original story passages and grade controls;
- eight distinct questions for Maya in Mixed WH (including WHO, WHERE, WHAT homework, WHAT color, WHEN);
- five different stories under Focused WHERE and two distinct WHAT questions for Maya;
- three-option answer arrays; separate staff expected answer and staff-controlled scoring;
- per-question identities stored in synthetic session save payload;
- a 25-story WHO probe with scoped `WH-K-B1` identifier and no synthetic duplicate story targets.

**Not certified:** Pixel-perfect reference-image matching, all authored answers clinically reviewed against every grade/scaffolding level, production authenticated staff write path, or reporting/graph aggregation of the WH question metadata. No actual student account was modified by the browser tests.

## Rollback

- GitHub pre-change snapshot: `rollback/COMPASS-WH-MULTI-QUESTION-2026-10-31-PRECHANGE`. Repo changes in this release are QA workflow/testing and release documentation only; the new runner lives in Supabase.
- Supabase original complete runner HTML **v4** was archived inactive; **v5** is active. If rolling back, confirm there has been no later release and run the following in one transaction:

```sql
BEGIN;
UPDATE public.compass_programming_runners
  SET active=(version=4),updated_at=now()
  WHERE runner_key='compass-wh-concepts-k8' AND version IN (4,5);
UPDATE public.compass_programming_programs
  SET runner_version=4,
      program_config=jsonb_set(
        (program_config #- '{sets,0,extra_qa}' #- '{wh_question_modes}'),
        '{runner_version}','4'::jsonb,true
      ),
      updated_at=now()
  WHERE program_code='CP-WH-CONCEPTS' AND runner_version=5;
-- IMPORTANT: Restore the original four V25 benchmark objects too:
UPDATE public.compass_programming_programs
 SET program_config=jsonb_set(program_config,
     '{compass_v25_standard,benchmarks}',program_config->'levels',true)
 WHERE program_code='CP-WH-CONCEPTS' AND runner_version=4;
COMMIT;
```

This restores the prior generic four benchmark objects and removes only the newly added extras/mode options. It does not delete targets, staff assignments, completed sessions, or trial records. If WH v5 has been used for student sessions, preserve the source-record question metadata and assess its reporting before rollback.
