## Context

Maintenance calories come from `computeCalcSnapshot` in `lib/nutrition.ts` (Mifflin-St Jeor BMR × activity multiplier). The dashboard (`app/dashboard/page.tsx`) passes that formula TDEE into a reserved `maintenance` slot of `components/summary-strip.tsx`. Weights are stored per calendar day in kg; calorie intake is stored per calendar day in `calorie_log` (mostly MFP imports, so days can be missing or partially logged). `lib/trend.ts` already has a time-aware EWMA trend and a least-squares weekly rate (`weeklyRate`) that the dashboard displays.

## Goals / Non-Goals

**Goals:**
- A pure, dependency-free estimator of observed TDEE with explicit guards, confidence and reasons.
- One policy for choosing the maintenance that drives target calories and macros, used identically by the dashboard, profile page/preview and profile-history recording.
- Explain to the user what drives their numbers.

**Non-Goals:**
- Persisting the estimate (it is recomputed from data on each request).
- Kalman-style or dynamic energy-density models (Hall model), adaptive macro coaching, check-in flows.
- Schema changes or migrations.

## Decisions

### Weight change: least-squares slope of weigh-ins, not EWMA-trend endpoints
`Δweight / days` is the least-squares slope of raw daily weights inside the window (via `weeklyRate` from `lib/trend.ts`, restricted to the window, ÷ 7). Alternative considered: `trend(end) − trend(start)` of the EWMA. The EWMA (α = 0.1) lags a linear change by ~9 days and is seeded at the first weigh-in, so for a user with short history it badly underestimates the change: on a synthetic −0.5 kg/wk ramp, the 28-day EWMA delta is 69% of the true change with 28 days of history, 93% with 42 days and only converges after ~3 months. That would bias the estimate by ~170 kcal exactly when new users look at it. The least-squares slope is unbiased for a linear trend, uses every weigh-in (missing weigh-ins just drop out), is comparable in noise (≈ ±90 kcal SE at σ = 0.5 kg daily noise over 28 days) and is the same number the dashboard already shows as "Weekly rate", so the tiles agree with each other.

### Window: 28 days ending yesterday, shortened for new users
Today's intake is in progress, so the window ends yesterday in the user's timezone. 28 days smooths water/glycogen swings and the menstrual cycle; 14 days is the minimum effective window. When the user's data starts inside the window, the window starts at the first data day so coverage is measured against days the user could have logged.

### Missing data and guards
- Days with no calorie row are excluded; days below 400 kcal are treated as incomplete logs and excluded too. Average = sum / logged days.
- Unavailable (with reason) when: window < 14 days (`short-history`), < 10 logged calorie days (`few-intake-days`), coverage < 60% (`low-intake-coverage`), < 5 weigh-ins or < 10-day weigh-in span (`few-weigh-ins`), no weigh-ins (`no-weights`), result outside 1000–6000 kcal (`implausible`).
- Partial days that pass 400 kcal still bias the estimate low; the coverage and confidence terms limit exposure, and the tooltip shows average intake so the user can spot it.

### Energy density: 7700 kcal/kg (shared `KCAL_PER_KG`)
7700 kcal/kg is the energy of adipose tissue. Real loss is mixed tissue (lean + glycogen/water), with lower density (~1800 kcal/kg lean), so 7700 overstates the energy of a given scale change, especially early in a diet; values of 5500–7000 are sometimes used for mixed tissue. We keep 7700 because the app's deficit target (`calcDailyCalorieChange`) is also derived at 7700 kcal/kg: maintenance and planned delta use the same conversion, so if the user eats the target the closed loop converges on the intended rate of change regardless of the true density, and errors in density cancel instead of compounding. The 28-day window and the trend slope also average out most of the water noise that motivates lower densities. The constant is now exported from `lib/nutrition.ts` and is a parameter of the estimator.

### Confidence and blending
`confidence = min(1, windowDays/28) × min(1, coverage/0.9) × min(1, weighIns/14)`. Policy in `chooseMaintenance` (`lib/nutrition.ts`):
- unavailable → `formula` (keeps the reason);
- confidence ≥ 0.75, or no formula TDEE → `adaptive`;
- otherwise `blended` = `c × observed + (1 − c) × formula`.
At the minimum guards confidence is ≈ 0.12, so a barely-qualifying estimate barely moves the formula; it ramps smoothly as data accumulates instead of jumping.

### Module boundaries
`lib/adaptive-tdee.ts` holds the estimator, series and explanation text and imports `lib/trend.ts` + `KCAL_PER_KG`. `chooseMaintenance` lives in `lib/nutrition.ts` (type-only import of the estimate) so `computeCalcSnapshot({ ..., observed })` can blend with the formula TDEE it computes, keeping the profile edit preview (formula changes as fields change) consistent. This avoids a runtime import cycle (`trend → nutrition`). A server-only `lib/queries/adaptive-tdee.ts` loads the last ~84 days of weights and calories and returns the estimate + weekly series for the profile page and profile actions; the dashboard reuses its already-loaded rows.

### Snapshot / profile history
`CalcSnapshot` gains optional `maintenance: { kcal, source, confidence, observedKcal }`. `tdee` stays the formula value; `targetCalories` and `macros` follow the chosen maintenance, i.e. what the user actually saw at that time. History renders the maintenance line only when present, so old entries render unchanged. jsonb → no migration.

### UI
Summary strip tile: value = chosen maintenance, subtitle = source (+ confidence %), info icon tooltip with the explanation. Profile page: a "Maintenance" card with formula TDEE, observed TDEE (or reason), the one in use, and a compact 8-week table of the observed series. The edit form's TDEE tile stays the formula; a "Maintenance in use" tile is added and target/macros follow it.

## Risks / Trade-offs

- [Under-logged days bias the estimate low] → 400 kcal floor, coverage guard, plausibility range, intake shown in tooltip.
- [Large water swings (e.g. starting a diet, creatine, travel) distort the slope] → 28-day window; blended at low confidence.
- [Target becomes a moving number] → it is recomputed per request but moves slowly because the window is 28 days.
- [7700 kcal/kg overstates mixed-tissue density] → self-consistent with the delta; documented, parameterised.

## Migration Plan

None: no schema change. Rollback = revert the commit; snapshots with a `maintenance` field are ignored by old code paths (extra jsonb key).

## Open Questions

- Should the user be able to pin the formula (opt out of adaptive)? Not in this change.
- Should the energy density depend on goal/body fat (Forbes curve)? Deferred.
