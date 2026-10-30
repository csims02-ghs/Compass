# COMPASS Stability Restore — Clothing Native V25 rollback
Date: 2026-10-30
Program: `CP-CLOTHING-IDENTIFICATION`, runner key `compass-clothing`.
Before change: active version 6. After change: active version 7. Version 6 is retained inactive.
Change scope: same-button Images Only / Exit Images Only, with the button relocated into the student-material header during Images Only. All teaching targets, embedded pictures, benchmarks, session saves and historical records are unchanged.

## Rollback SQL
```sql
BEGIN;
UPDATE public.compass_programming_runners SET active=false
 WHERE runner_key='compass-clothing' AND version=7;
UPDATE public.compass_programming_runners SET active=true
 WHERE runner_key='compass-clothing' AND version=6;
UPDATE public.compass_programming_programs SET runner_version=6
 WHERE program_code='CP-CLOTHING-IDENTIFICATION';
COMMIT;
```
GitHub rollback does not change Supabase revisions.
