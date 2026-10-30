# COMPASS Functions — Verbal Instructions Benchmark 5
Date: 2026-10-30

## Release
- Program code: `CP-DIR-VISUAL-087`; runner key: `compass-functions`.
- Before: catalog and runner version 4, 40 master targets, four benchmarks.
- After: catalog and **native** runner version 6, 50 master targets, five benchmarks. Version 5 is retained inactive as a staging snapshot; native v6 is the corrected version.
- Added `FUNC-B5`: 10 spoken instruction targets `41` through `50`. Previously saved 40 targets, 7 assignment records, historic trials and sessions were not overwritten.
- Each of the seven existing student assignments received ten previously absent target registry entries. No existing target state or scoring was overwritten.
- Student-facing material remains a neutral audio icon and general readiness text in B5; exact verbal SD is staff-only on the scoring panel; trial capture includes instruction modality.

## Backups and rollback
- GitHub baseline: `rollback/COMPASS-FUNCTIONS-VERBAL-BENCHMARK-2026-10-30-pre-change` at commit `e8e5059305825d0a59f7603c38211cf0ed7917e2`.
- Original program description, full JSONB config, original runner version recorded in `docs/COMPASS_FUNCTIONS_B5_PRECHANGE_2026-10-30.json`.
- Original *complete* runner HTML is preserved in Supabase `public.compass_programming_runners` version **4**, inactive; do not delete it. Intermediate native v5 is also inactive, preserved for forensic rollback only.
- Restore the GitHub adapter JS/CSS via a normal revert commit (never force-push).
- To restore the native runner selection, execute in one transaction after validating the current state:

```sql
BEGIN;
UPDATE public.compass_programming_runners SET active=(version=4),updated_at=now()
WHERE runner_key='compass-functions' AND version IN (4,5,6);
UPDATE public.compass_programming_programs SET runner_version=4,updated_at=now()
WHERE program_code='CP-DIR-VISUAL-087' AND runner_version=6;
COMMIT;
```

**Full template rollback**: Set the program's `program_config` and `description` to their exact saved values in `docs/COMPASS_FUNCTIONS_B5_PRECHANGE_2026-10-30.json` in the same SQL transaction as above. Do not confuse v4 runner rollback alone with a full catalog rollback: the V25 adapter reads benchmark definitions from the program config and would otherwise still show B5.

**Preserve student records**: If sessions have been scored under B5, do **not** delete the new master targets or the 70 student-target rows. They may be needed to retain references, scores and audit trails. Instead hide/inactivate B5 at the catalog/UI level and keep historical data.

## Tests
- GitHub `scripts/test-functions-v25-live.cjs` executes **native** Functions runner v6 and verifies B1-B4 retained, B5 targets, staff-only SD, no student-facing written answer, verbal-only event metadata, authorized synthetic save/probe, 1024x768 and 1440x900.
- Real logged-in school account / per-student clinical verification must be separately confirmed. Synthetic browser tests cannot certify every student setup.
