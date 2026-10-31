# COMPASS WH Concepts — Smooth Questions / Array N/A or 3
Date: October 31, 2026

## Scope and changes
Program code: `CP-WH-CONCEPTS`; standalone runner key: `compass-wh-concepts-k8`.

- Original WH Concepts native V25 **v3 preserved intact** and inactive. New **v4 active**.
- WH passages are presented with a clearer, responsive story/question hierarchy: grade, level and WH category remain visible, and questions are written as a clean single sentence.
- The 25 original story contexts, 900 original grade-specific master target keys, all K–8 grades and four scaffolding levels remain unchanged.
- **Array Size** now offers `N/A · Open response` (default) and `3 choices`. Three choices present the canonical correct response and two different answers from the same grade and WH type, shuffled reproducibly within a trial. Three choices require staff scoring; they do not auto-mark accuracy.
- Student selection is recorded by the existing scoring handler, and the selected array/grade/level are recorded with the saved synthetic session's `v25_run` details.
- Existing 38 common V25 structural control markers and all 72 HTML element IDs remained present. Staff-only expected-response panel is retained.
- The GitHub `compass-page2-standard.js` renderer excludes the native WH runner from the legacy overlay.
- Database catalog `array_options` is `["N/A",3]` and `default_array_size` is `"N/A"`.

## Automated verification
`scripts/test-wh-smooth-array-v25.cjs` runs Chrome checks at 1024 × 768 and 1440 × 900. It checks:
- 38 common runner structural markers are all present;
- all 900 target keys are unique; 25 stories; four benchmark groups; grade K–8 and four level modes;
- `N/A` presents open response and `3` presents exactly three selectable answers;
- original full passage and question display; correct response remains on staff panel in N/A mode;
- client-supplied synthetic assignment Save Setup, keyed session-save payload, array-size and grade/level metadata; no real student writes;
- layout remains 70/30 with no horizontal overflow.

**Limitations:** Structural marker parity does not certify pixel-by-pixel equivalence. Browser tests use **synthetic** authenticated runtime stubs; a real logged-in student session save and full clinical validation across every level is still required. The old WH v3 level implementations are retained as the source and may have unresolved multi-question level fidelity; this change does not claim a redesign of those multi-question trial groups.

## Rollback
GitHub pre-change branch: `rollback/COMPASS-WH-QUESTIONS-ARRAY-2026-10-31-PRECHANGE`. Revert the commit modifying `compass-page2-standard.js` if reverting the native WH runner.

Supabase v3 runner is preserved. To return to v3 safely, after confirming v4 is currently active and no subsequent releases exist, use a single transaction:

```sql
BEGIN;
UPDATE public.compass_programming_runners
 SET active=(version=3), updated_at=now()
 WHERE runner_key='compass-wh-concepts-k8' AND version IN (3,4);
UPDATE public.compass_programming_programs
 SET runner_version=3,
     program_config=jsonb_set(
        jsonb_set(program_config,'{runner_version}','3'::jsonb,true),
        '{array_options}','[2,3,4,5,6,8,10,12,15,20,25]'::jsonb,true
     ),
     updated_at=now()
 WHERE program_code='CP-WH-CONCEPTS' AND runner_version=4;
COMMIT;
```
If a complete config rollback is necessary, also restore the original `default_array_size=3` (instead of N/A); review later edits before writing. Do not remove any target records or historical session data. A GitHub revert alone does not roll back the Supabase runner.

## Release status
Program-local automated layout and synthetic-save tests passed; not a clinical certification or real-account end-to-end save verification.
