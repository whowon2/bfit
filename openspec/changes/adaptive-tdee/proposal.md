## Why

Maintenance calories today come only from the Mifflin-St Jeor × activity-multiplier formula, which is routinely off by several hundred kcal for an individual. The app already stores a daily weight series and daily calorie intake (MFP imports), which together reveal the user's real energy expenditure; using it makes calorie and macro targets self-correcting, MacroFactor-style.

## What Changes

- New pure algorithm `lib/adaptive-tdee.ts`: estimates observed TDEE over a rolling 28-day window as `avg logged intake − weight slope (kg/day) × 7700 kcal/kg`, with coverage guards (missing calorie days are excluded, not zero; minimum logged days, coverage and weigh-ins), a plausibility check, a confidence score, a reason when unavailable, and a weekly series.
- `lib/nutrition.ts` chooses the maintenance that drives targets: adaptive at high confidence, a confidence-weighted blend with the formula TDEE at lower confidence, the formula when no estimate is available. Target calories = chosen maintenance + the goal-constrained daily delta; macros follow.
- Dashboard: the reserved maintenance tile shows the chosen maintenance with source `adaptive`/`blended`/`formula` and an info tooltip explaining the computation or why it fell back. Today's calorie target uses the chosen maintenance.
- Profile page: shows formula TDEE and observed TDEE side by side, the maintenance in use, and a small weekly table of the observed estimate; the edit preview's target and macros follow the chosen maintenance.
- `profile_history` snapshots gain an optional `maintenance` field (source, kcal, confidence, observed kcal) so recorded targets reflect what the user saw; older entries without it keep rendering.
- No database schema change (the snapshot is jsonb).

## Capabilities

### New Capabilities
- `adaptive-tdee`: observed-maintenance estimation from intake and weight, its guards, confidence, blending with the formula, and how it is surfaced.

### Modified Capabilities
- `dashboard-summary`: the reserved maintenance slot is now filled with the adaptive/blended/formula maintenance; calories-today target uses it.
- `nutrition-goal`: target calories are the chosen maintenance (not always the formula TDEE) plus the goal-constrained change.

## Impact

- New: `lib/adaptive-tdee.ts`, `lib/queries/adaptive-tdee.ts`.
- Modified: `lib/nutrition.ts` (`KCAL_PER_KG`, `chooseMaintenance`, `computeCalcSnapshot` takes the observed estimate), `db/schema.ts` (`CalcSnapshot.maintenance?` type only), `app/dashboard/page.tsx`, `components/summary-strip.tsx`, `components/dashboard-view.tsx`, `app/profile/page.tsx`, `app/profile/update-form.tsx`, `actions/profile.ts`, `CLAUDE.md`.
- No new dependencies, no migration.
