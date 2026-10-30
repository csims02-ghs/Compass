# COMPASS page 2 — 18 October 2026 programs (frozen scope)

The COMPASS Program Library is sorted by Last Updated (Newest), with 25 programs per page. At the time of this audit, positions 36–50 (page 2) displayed October 18, 2026. The frozen list is:

1. Inferential Passage Comprehension — CP-READ-INFER-095
2. WH Concepts — CP-WH-CONCEPTS
3. Word Problems — CP-WORD-PROBLEMS
4. Identifying Trusted Adults and Getting Help — CP-144-IDENTIFYING-TRUSTED-ADULTS-AND-GETTING-HELP
5. Letter Word Connection — CP-WORD-CONNECTION
6. Working Memory in Functional Tasks — CP-154-WORKING-MEMORY-IN-FUNCTIONAL-TASKS
7. Vocal and Speech-Sound Imitation — CP-131-VOCAL-AND-SPEECH-SOUND-IMITATION
8. Whole-Group Classroom Directions — CP-DIR-GROUP-086
9. Workplace Communication and Asking for Help — CP-166-WORKPLACE-COMMUNICATION-AND-ASKING-FOR-HELP
10. High-Frequency Word Reading — CP-READ-HF-088
11. Functional Writing and Forms — CP-099-FUNCTIONAL-WRITING-AND-FORMS
12. Group Conversation and Topic Shifts — CP-GROUP-CONVERSATION-TOPIC-SHIFTS
13. Independent School and Home Routines — CP-140-INDEPENDENT-SCHOOL-AND-HOME-ROUTINES
14. Functional Keyboard and Touchscreen Access — CP-108-FUNCTIONAL-KEYBOARD-AND-TOUCHSCREEN-ACCESS
15. Independent Leisure Selection — CP-113-INDEPENDENT-LEISURE-SELECTION

**Completed:** The first program, Inferential Passage Comprehension, upgraded from active runner version 1 to version 2 using a native two-screen V25 template based on the proven Functions v6 runner. All 40 original passage/question targets and four benchmarks were preserved; staff-only accepted inference, 70/30 page 2, IEP TTTTT, and standard behavior and scoring UI. Source HTML parsed cleanly. New `scripts/test-oct18-inference-v25.cjs` passed at 1024x768 and 1440x900; 38 structural controls are present, tested benchmark target setup, secure transport synthetic acknowledgments, a one-step staff-scored run, and a ten-target benchmark probe. The student-profile page-2 standard adapter is taught to pass through this first-class native runner.

**Not certified:** The 38 structural controls tested are not a pixel-for-pixel image comparison against every locked reference marker; authenticated real-user student-session saving has not been independently tested (there are no active assignments to the 15 programs as of this audit). Do not claim complete production certification. Other 14 programs remain on their original active runner versions, unchanged in this release.

**WH Concepts blocker:** Its 900 master targets include 700 repeated question names across grade levels. A generic name-only session save can attach answers to the wrong master target. It requires unique-key-based mapping and preservation of K–8, WH type, original 25 story contexts and four levels before promotion. No unsafe WH update was applied.

**Rollback:** Pre-change GitHub branch `rollback/COMPASS-PAGE2-OCT18-V25-2026-10-30-BASELINE`. Original Inferential Passage runner is retained in Supabase as inactive v1, and can be reactivated together with setting `compass_programming_programs.runner_version=1` in the same transaction. Revert the specific GitHub page-2 adapter exclusion only if reverting to the old one-page runner. The source program's `updated_at` now changes its position in the dynamically sorted library; refer to program code rather than page position.

**Remaining:** Update and verify the other 14 strictly one program at a time, including program-specific teaching materials and real-save audits. Avoid introducing generic runners that discard domain-specific interactive functions or student accommodations.
