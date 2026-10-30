# COMPASS Stability Restore — 2026-10-30: student graph permissions
**Status:** Production security patch; separate from UI rollback.
**Baseline code:** `rollback/COMPASS-STABILITY-RESTORE-2026-10-30-pre-fix` at `b64156d7e617455133c7260cbcbfac28636fcdef`.
**Migration:** `compass_stability_restore_20261030_secure_student_graph`.

## Problem
The public view `student_program_goal_behavior_graph_view` ran with elevated view-owner privileges, and anonymous users had a SELECT grant. The permissive session SELECT policy `compass_session_archive_visibility` granted access to all non-deleted sessions without checking the student's authorization.

## Forward SQL
```sql
ALTER VIEW public.student_program_goal_behavior_graph_view SET (security_invoker = true);
REVOKE SELECT ON public.student_program_goal_behavior_graph_view FROM anon;
ALTER POLICY compass_session_archive_visibility ON public.compass_program_sessions
USING (
  EXISTS (
    SELECT 1 FROM public.student_compass_programs sp
    WHERE sp.id = compass_program_sessions.student_compass_program_id
      AND private.can_access_student(sp.student_id)
  ) AND (deleted_at IS NULL OR deleted_by = (SELECT auth.uid()))
);
```

## SQL rollback — only if authorization regression requires it
**Warning:** This rollback reopens the known exposure. Prefer correcting the access policy instead.
```sql
BEGIN;
ALTER VIEW public.student_program_goal_behavior_graph_view RESET (security_invoker);
GRANT SELECT ON public.student_program_goal_behavior_graph_view TO anon;
ALTER POLICY compass_session_archive_visibility ON public.compass_program_sessions
USING ((deleted_at IS NULL) OR ((deleted_at IS NOT NULL) AND (deleted_by = (SELECT auth.uid()))));
COMMIT;
```

## Verify
- View has `security_invoker=true` and `anon` lacks SELECT.
- Authenticated staff retain SELECT subject to underlying student RLS.
- Session SELECT policies require `private.can_access_student`.
- Test a staff user's authorized IEP chart and denied access to another student's chart.

Only permissions and policy SQL are changed, not session rows or V25 program content. GitHub rollback does not revert database permissions.
