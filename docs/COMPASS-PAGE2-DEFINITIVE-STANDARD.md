# COMPASS — definitive Page 2 runner standard (v20261026-v1)

This is the authoritative design contract for future COMPASS instructional program updates. The primary implementation is `compass-page2-standard.css`, applied to compatible, live HTML runtimes by `compass-page2-standard.js` and the existing Program Hub, program-opening, and offline-pack pathways. Update the shared CSS rather than layering a new patch in each program.

## Layout

- Page 1 remains Program Setup + Instructions, without a student selector. Students are inherited from Student Profile.
- Page 2 is a two-column ~70% Student Material / ~30% Staff Scoring runner on landscape iPad and desktop. Smaller widths adapt responsively.
- Left: Student Material heading, target mode, large SD, stage or target context, real instructional choices, unobtrusive note. Never substitute cosmetic choices for functional materials.
- Right, in order: Trial & Scoring header, Images Only toggle when appropriate, three score summaries, step and independent accuracy, compact mastery/sync notice, the three scoring choices, Behavior Tracking, and a bottom-anchored Save & Next Step.
- All buttons must remain accessible; the right panel may scroll as a last resort on unusually short viewports, but the Behavior Tracking section itself does not scroll with one through five behaviors.

## Behavior tracking

- Display **all student-assigned behaviors** selected for this session (up to five without a separate scrollbar); never substitute demo behaviors for a real student's assigned list.
- A one-column list: long behavior label | minus | centered frequency | plus.
- Five rows visible at once in standard iPad landscape, laptop, desktop. Rows min 44–48px, touch +/- buttons 39–40px, clear 12–15px labels, aligned counts and controls.
- For 6–8 selected behaviors, preserve all assignments and existing count data, but allow the behavior region to scroll, without deleting or capping student data.
- Counts must persist independently from scoring outcomes and be included in normal save/sync flows. A visual layout change must never modify scoring, target mastery, offline sync, behavior selection or student context.
- The Save & Next Step action stays accessible at the bottom of the scoring panel.

## Mandatory checks before publishing a runner

Run `node scripts/test-page2-standard.cjs` with installed Playwright and Chrome. Test 1, 3, 5, 8 behaviors, long labels, 1024x768, 1366x768, 1440x900 and 1920x1080 viewports. Confirm no row is clipped with five behaviors, labels don't overlap count buttons, touch targets remain at least 38px, the Save action is visible, and source records are not touched.

The shared visual standard is injected **only** where Page 2 layout IDs `runPage` and `behaviorList` and `run-grid` are present. Older runners with different markup must be migrated separately; merely injecting CSS does not make an incompatible runner conform.

## Page 2 banner and mastery notices (2026-10-27)

Hide the large `COMPASS · [program name]` brand heading **only while Page 2 is active**; retain functional Setup and End Session controls. Suppress the specific transient `Student mastery could not be verified with COMPASS; please reconnect.` display text, but retain the underlying mastery verification state, calculations and persistence. Verified mastery and instructional-date information may still display when available. Collapse the empty progress notice so no placeholder gap is left. Apply using the shared standardizer and stylesheet; do not add duplicate per-program CSS. Previously downloaded offline HTML is re-standardized when launched.
