# COMPASS Stability Restore — Body Parts Images Only (2026-10-30)
Program: `CP-BODY-PARTS`. Active runner before fix: `compass-body-parts-v25` version 3.

## Versioned fix
The corrected version 4 changes only the native Page 2 Images Only UI: one visible toggle enters/exits, moves to the student-material header when scoring is hidden, and restores its location when controls return. Scoring, targets, benchmarks, behavior assignments, session saving, and mastery remain unchanged.

## Rollback SQL
```sql
BEGIN;
UPDATE public.compass_programming_runners SET active=false
 WHERE runner_key='compass-body-parts-v25' AND version=4;
UPDATE public.compass_programming_runners SET active=true
 WHERE runner_key='compass-body-parts-v25' AND version=3;
UPDATE public.compass_programming_programs SET runner_version=3
 WHERE program_code='CP-BODY-PARTS';
COMMIT;
```

Original version 3 is retained inactive after fix. Test complete same-button toggle, Page 2, and program/session integrity before considering all Body Parts requirements verified.
