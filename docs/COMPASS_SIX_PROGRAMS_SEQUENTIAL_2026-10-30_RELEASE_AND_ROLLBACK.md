# COMPASS Six-Program Sequential Alignment — October 30, 2026

**Status: PARTIAL V25 ALIGNMENT — NOT 38/38 CERTIFIED.**

The six programs were inspected and amended one after another, without concurrent program edits. Existing assignment IDs, historical session/trial records, embedded program assets and inactive runner versions were retained. No program marked `on_hold` was activated.

**Repository restore reference (code only):** `rollback/COMPASS-SIX-PROGRAM-V25-2026-10-30-PRECHANGE`, commit `be353d82bd183ce50049302b2f613957df95cd4b`.

| Program | Current runner | Completed, verified backend changes | Remaining gap |
| --- | --- | --- | --- |
| 1:1 Count | compass-counting v1 | Master registry now 100 counting targets with 700 new links across 7 existing assignments; original 100 targets preserved | Inactive native v25 draft is DEMO/local-only; must implement authenticated saving before promotion. Current v1 is not the two-page V25 UI |
| Prepositions & Spatial Concepts | compass-prepositions-spatial v1 | 10 real clinical benchmarks mapped into standard metadata; Short and IEP Chain immediately consecutive; original 25 targets | Legacy page layout; images tagged pending_upload must not be silently replaced with placeholders; 38-marker parity not verified |
| Pretend and Imaginative Play | compass-main v6 | 40 targets across four stages explicitly mapped, new staff instructions, IEP Chain | **On Hold**, 403 to public unauthenticated runner. Preserve Platform Admin restriction; authenticated browser QA pending; shared legacy runner must not be globally overwritten |
| Requesting Help and Assistance | compass-main v6 | 40 targets across four stages explicitly mapped, functional communication staff instructions, IEP Chain | **On Hold**, 403 to public unauthenticated runner. Preserve Platform Admin restriction; authenticated browser QA pending |
| Letter Discrimination | compass-letter-discrimination **v2** | Native runner select now has IEP Chain TTTTT directly after Short. All eight benchmark groups and 220 active targets preserved; 106 older, inactive targets retained | Still uses the legacy one-page runner, not 38/38 two-page V25; authenticated cloud saving not verified |
| Less Than / Equal To / Greater Than | compass-less-equal-greater **v2** | Native runner select now has IEP Chain TTTTT directly after Short; 12×15 targets maintained | Still uses the legacy one-page runner, not 38/38 two-page V25; authenticated saving not verified |

## Stress-testing scope
`scripts/test-six-programs-sequential-20261030.cjs` loads each public runner strictly sequentially at landscape widths 1024 and 1366. It checks HTTP response, parsing/rendering, benchmark and target counts where exposed, five-T IEP chain order, JavaScript runtime exceptions and horizontal overflow. **It is an incremental smoke test, not a 38/38 acceptance suite.** It expects 403, rather than bypassing access controls, for the two On-Hold programs. It does not create real student sessions or assert that cloud save works.

## Rollback: Versioned runner changes only
Restore either independent program without touching other programs. In each example, perform the operation in one transaction after confirming no newer version has been published:

```sql
BEGIN;
-- Letter Discrimination: v2 -> v1
UPDATE public.compass_programming_runners
SET active=(version=1),updated_at=now()
WHERE runner_key='compass-letter-discrimination' AND version IN (1,2);
UPDATE public.compass_programming_programs
SET runner_version=1,updated_at=now()
WHERE program_code='CP-LETTER-DISCRIMINATION' AND runner_version=2;
COMMIT;
```

```sql
BEGIN;
-- Less / Equal / Greater: v2 -> v1
UPDATE public.compass_programming_runners
SET active=(version=1),updated_at=now()
WHERE runner_key='compass-less-equal-greater' AND version IN (1,2);
UPDATE public.compass_programming_programs
SET runner_version=1,updated_at=now()
WHERE program_code='CP-LESS-EQUAL-GREATER' AND runner_version=2;
COMMIT;
```

**Important:** Runner rollback alone does not revert program-config changes. The new `ui.iep_chain`, `trial_chains` and `compass_v25_standard` metadata remain until individually restored; they must not be blindly overwritten if newer changes have been made.

## Backend rollback cautions
- **1:1 Count:** Do **not** automatically delete the 100 master targets or 700 student targets. They might already be referenced by later sessions, IEP links or target states. If rollback is required, first check every dependent table/foreign key and any student target status changes; retain target data if used. Prior to the registry repair there were zero master and zero student target rows for this program.
- **Prepositions:** Original runner v1 was not replaced. The six pre-change `trial_chains` did not include Short/IEP. Remove only those two added choices if necessary; restore the original provisional benchmark labels only after reviewing other config edits.
- **Pretend Play / Requesting Help:** Original `instructions`, `trial_chains` and `ui` were absent. The new keys can be removed selectively after checking whether users subsequently changed them. Do **not** change `program_status='on_hold'` as part of rollback.
- **Letter Discrimination:** Keep all 106 inactive historical targets. Do not merge or delete them merely because the active bank has 220 targets.
- **Less / Equal / Greater:** Preserve all 180 targets and 12 benchmark definitions. Runner v1 remains available.
- Code rollback via the GitHub restore branch cannot revert Supabase database changes; handle them independently.

## Outstanding release gates
1. Build a genuinely native two-page locked V25 runner for every incomplete program, preserving unique teaching modes, manipulatives and stimulus assets.
2. Define and run the **canonical 38-marker comparison** against the approved reference for each program (layout, setup, five-step IEP Chain, scripts, outputs, behaviors and flow). No 38/38 claim without measuring all 38.
3. Verify authenticated student assignment Save Setup and idempotent teaching/probe session persistence with negative tests, especially offline/retry, stale student context, and Next Program gating.
4. Real authorized staff validation for protected On Hold programs before any change of publication status; do not bypass restrictions.
5. Only promote a version after passing its program-specific Chrome tests at desktop/iPad landscape sizes.
