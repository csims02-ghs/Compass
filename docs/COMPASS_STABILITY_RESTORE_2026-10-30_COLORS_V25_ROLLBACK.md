# COMPASS Stability Restore — Colors Native V25 Images-Only Fix
Date: 2026-10-30
Program: `CP-COLORS` / runner key `compass-colors-clean`

## Versioned safety
- **Old retained runner:** version 7, originally active.
- **Corrected runner:** version 8, with one-button Images Only / Exit Images Only.
- **Unchanged:** targets, benchmarks, IEP Chain, sessions, scoring, historical data, all other programs.

The corrected runner was created as a new version, not by overwriting version 7.

## Rollback SQL — Colors only
```sql
BEGIN;
UPDATE public.compass_programming_runners
  SET active = false WHERE runner_key='compass-colors-clean' AND version=8;
UPDATE public.compass_programming_runners
  SET active = true WHERE runner_key='compass-colors-clean' AND version=7;
UPDATE public.compass_programming_programs
  SET runner_version = 7
  WHERE program_code='CP-COLORS';
COMMIT;
```

## Verification after patch
- Exactly one active Colors runner.
- Active Colors runner version 8, with original version 7 stored inactive.
- Image Only button moves into the visible student-material header while staff scoring is hidden.
- The same button reads Exit Images Only and returns controls on click.
- Save and Next, trial events, benchmarks, and student behavior recording remain untouched.
