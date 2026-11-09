## Context

`app/dashboard/page.tsx` and `app/profile/page.tsx` both render `CreateProfileForm` when `getProfile()` returns nothing, so a new user must finish a nine-field profile before logging any weight — and the create form's preview passes `weightKg: null`, so it can never show targets. The dashboard itself is a `Chart` + `WeightList` row; the add form, import and export buttons live inside the collapsible list card. Queries run serially. The chart footer's "trend" compares the first and last raw daily values of the window.

Constraints: stay in the ShadCN new-york / neutral look; no schema change; reads stay in `lib/queries/*`, writes in `actions/*` with `requireUser()`; weights are kg in the DB and converted with `lib/units.ts`; day boundaries use the user's timezone via `lib/dates.ts`.

## Goals / Non-Goals

**Goals:** log-first onboarding; a summary strip derived from existing data; a prominent quick log; a layout that works at 360px; a robust trend and nicer chart axis; one Data section for import/export with feedback; the listed small fixes.

**Non-Goals:** adaptive TDEE (only a reserved slot); new tables or columns; a test runner (math helpers are kept pure so one can be added later); changing the profile form fields.

## Decisions

### 1. Profile is optional, not the first onboarding step
The dashboard always renders. Without a profile, nutrition tiles (body fat vs target, projection, calories vs target, maintenance) collapse into one "Set up your profile" prompt linking to `/profile`. `/profile` still shows the create form when no profile exists (that is the page's own purpose, not a gate), now fed with the latest weight and body fat so the preview is complete.

*Alternative considered:* make "first weight + body fat" step 1 of a multi-step profile wizard. Rejected: it keeps the profile as a mandatory gate (users who only want a weight log still face it), and duplicates the quick log. Log-first means the weight is already there when the user opens the profile, which fixes the empty preview for free.

The create form's submit no longer requires `isDirty` — submitting the defaults is legitimate.

### 2. Trend math in `lib/trend.ts` (pure, kg in / kg out)
- `ewmaTrend(points, alpha = 0.1)`: time-aware EWMA over day-sorted points; for a gap of `g` days the factor is `1 − (1−α)^g`, so sparse loggers aren't over-smoothed. α = 0.1/day is the classic "Hacker's Diet" value: one outlier moves the trend by 10%.
- `weeklyRate(points, { windowDays: 28 })`: least-squares slope over the last 28 days × 7. Requires ≥2 points and ≥7 days span. Slope over raw points is robust to a single noisy endpoint, unlike first-vs-last; 28 days balances responsiveness and noise.
- `projectToTarget({ currentKg, currentBodyFat, targetBodyFat, ratePerWeekKg })` reuses `calcTargetWeightKg` from `lib/nutrition.ts` and returns `{ targetKg, weeks } | { reason }`.
- `niceDomain(min, max, maxTicks)`: classic nice-number algorithm (steps 1/2/2.5/5 × 10ⁿ), returns `{ domain, ticks }`.
- `windowChange(trendPoints, cutoffDay)`: trend at last minus trend at first point at/after the cutoff.
Days are "YYYY-MM-DD" strings; day differences use `Date.UTC` so DST and browser timezone can't skew them.

*Alternative:* weekly-average delta. Rejected as the primary stat because calendar weeks with 1 vs 7 logs carry very different noise; it is still visible on the chart's weekly series.

### 3. Shared window state via a client `DashboardView`
The summary's "change over window" must follow the chart's 1M/3M/… preset. A client `DashboardView` owns `windowPreset` and passes it to `SummaryStrip` and `Chart` (now controlled for the window; the chart still persists its prefs, including window, to localStorage and reports loaded/changed windows up). The server page computes everything that needs the DB or the timezone — `today` (in the user's tz), the nutrition snapshot (`computeCalcSnapshot` with latest weight/body fat), today's calorie row — and passes plain props, so SSR and hydration agree.

### 4. Reserved maintenance slot
`SummaryStrip` takes `maintenance: { kcal: number | null; source: "formula" | "adaptive" }`. This change passes `{ kcal: snapshot.tdee, source: "formula" }`; the tile labels formula estimates as such. The adaptive-TDEE change only needs to compute a value in the page and pass `source: "adaptive"`.

### 5. Layout (mobile-first)

```
phone (stacked)                    lg (≥1024px)
┌───────────────────┐              ┌──────────────┬──────────────────────────┐
│ Today             │              │ Today        │ stats (3-col divided)    │
│ 80.2 kg trend     │              │ trend + log  │                          │
│ [ 80.4 ] kg [Log] │              ├──────────────┴─────────┬────────────────┤
├───────────────────┤              │ Progress chart         │ History        │
│ stats 2-col grid  │              │ (trend line, nice y)   │ (scrolls)      │
├───────────────────┤              │                        │                │
│ chart             │              └────────────────────────┴────────────────┘
├───────────────────┤
│ history (scroll)  │
└───────────────────┘
```

The stats are one bordered panel with divided cells rather than a row of identical cards (less "card kit", reads as one instrument readout). Numbers use `tabular-nums`. Direction colour is goal-aware: moving toward the goal is emerald, away is amber, no profile/maintain is neutral — "down" is not universally good. The weight list drops the `w-14` collapse; it is a fixed-height scroll area (`h-[420px]` phone, chart height on lg). Chart controls wrap; x-axis ticks are short ("MMM d"), unrotated.

### 6. Quick log replaces `add-weight.tsx`
`QuickLog` (client) prefills the input with `displayWeight(latest, unit)`, has an optional body-fat field, and a primary "Log today" / "Update today" button. "Another day" reveals the date picker (defaulting to `parseDay(today)`) and time input. It calls the existing `addWeightEntry` (unchanged upsert) and toasts "Logged" / "Updated today's entry". No new server code.

### 7. Imports return counts
`importWeightEntries` and `importCalorieEntries` keep strict zod validation (spec: malformed payload throws, inserts nothing) and now return `{ imported, updated, skipped }`, counting via `RETURNING (xmax = 0)` and within-file duplicate days as skipped. Client-side normalization drops rows without a usable date/value before sending and adds them to `skipped`. Errors map to specific toasts (bad JSON, unknown format, nothing to import, server rejected).

Nutrition export writes the MFP layout with a single "Daily total" meal per day (`lib/nutrition-export.ts`, pure), so it re-imports with the existing parser.

## Risks / Trade-offs

- [EWMA lags real change by design] → the weekly rate uses the slope of raw points, not the trend, and the raw daily line stays on the chart.
- [Existing chart prefs in localStorage lack the trend series] → prefs gain a `version`; prefs saved before version 2 get "trend" added on load.
- [Settings page now loads all weights/calorie rows for export] → acceptable for a personal tracker (≤ a few thousand rows); export could move to a route handler later.
- [Projection is a linear extrapolation] → copy says "at current rate" and hides the date when the rate is ~0 or moving away.

## Migration Plan

UI and action return types only; no DB migration. Rollback = revert the commit.

## Open Questions

- Should α and the 28-day rate window become user settings? Fixed for now.
- Should the nutrition export also exist as JSON? CSV in MFP layout was chosen for round-tripping with the existing importer.
