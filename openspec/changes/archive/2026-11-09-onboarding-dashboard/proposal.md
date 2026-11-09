## Why

A new user lands on `/dashboard` after signup and is blocked by a long profile form (birth date, target body fat, carb ratio…) before they can log a single weight — yet that form's calorie/macro preview needs a weight, so it is empty. Once past the gate, the dashboard is just a chart plus a side list: logging is buried in a collapsible card, the "trend" is a noisy first-vs-last raw delta, the list collapses to a useless `w-14` sliver on phones, and import/export is split between the dashboard and the profile page with no success feedback.

## What Changes

- **Onboarding**: the profile no longer gates `/dashboard`. A new user can log weight (and optional body fat) immediately; the dashboard shows a "set up your profile to get calorie/macro targets" prompt where the nutrition stats would be. `/profile` still hosts profile creation, now with a live preview fed by the latest logged weight/body fat, and a save button that works without first editing a default.
- **Dashboard summary strip** computed from existing data: trend weight (EWMA, in the user's unit), rate of change per week (least-squares slope), change over the selected chart window, body fat now vs target (with profile), projected date to reach target (when the rate moves toward it), today logged / not yet, today's calories vs target (with calorie data + profile). A clearly reserved "maintenance" tile shows the formula TDEE today and is the hook a later adaptive-TDEE change will fill.
- **Quick log**: a prominent "log today" card at the top of the dashboard, prefilled with the last weight in the user's unit, defaulting to today in the user's timezone, with optional body fat and an "another day" date/time option. Respects the one-entry-per-day upsert and says when it updated an existing entry.
- **Mobile layout**: stacked single column on phones (quick log → stats grid → chart → history), side-by-side chart/history on large screens; the history list no longer collapses to `w-14`; chart controls wrap; x-axis labels are short and unrotated.
- **Robust trend**: new pure helpers in `lib/trend.ts` (time-aware EWMA trend weight, least-squares weekly rate, projection, nice axis domain). The chart gains an EWMA "Trend" line and a y-axis rounded to nice tick values; the noisy first-vs-last footer is replaced by the summary strip's window-change stat.
- **Data section in Settings**: weight JSON import/export and MyFitnessPal CSV import move to Settings → Data, plus a new nutrition CSV export (MFP-compatible, so it re-imports). Imports show a toast with imported / updated / skipped counts and clear error messages. Removed from dashboard and profile.
- **Small fixes**: delete-dialog copy, dashboard/profile queries run in parallel with `Promise.all`, no implicit `any` in import components, light landing-page polish.
- No schema changes.

## Capabilities

### New Capabilities
- `onboarding`: profile is optional; weight logging is available immediately; nutrition features prompt for a profile instead of gating the app.
- `dashboard-summary`: summary statistics (trend weight, rate, window change, body fat vs target, projection, today status, today's calories vs target, reserved maintenance slot) and the trend math behind them.
- `quick-weight-log`: prominent prefilled "log today" action on the dashboard.
- `data-import-export`: consolidated Settings → Data section with import feedback and nutrition export.

### Modified Capabilities
- `progress-chart-averages`: adds an EWMA trend series and a nice-rounded y-axis domain to the progress chart.

## Impact

- New: `lib/trend.ts`, `lib/nutrition-export.ts`, `components/quick-log.tsx`, `components/summary-strip.tsx`, `components/dashboard-view.tsx`, `components/data-section.tsx`, `components/export-nutrition.tsx`.
- Changed: `app/dashboard/page.tsx`, `app/profile/page.tsx`, `app/profile/create-form.tsx`, `app/settings/page.tsx`, `app/page.tsx`, `components/progress-chart.tsx`, `components/weight-list.tsx`, `components/remove-weight.tsx`, `components/import-weights.tsx`, `components/import-nutrition.tsx`, `components/export-json.tsx`, `actions/weight.ts`, `actions/calorie.ts` (import actions return counts), `CLAUDE.md`.
- Removed: `components/add-weight.tsx` (replaced by quick log).
- No DB migration, no new dependencies.
