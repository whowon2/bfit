## Context

`components/progress-chart.tsx` renders a single `LineChart` with three series (daily/weekly/monthly) built from one `buildChartData(weights)` function. Currently that function computes, for every log entry `i`, a trailing rolling average over the last 7/30 real days (two-pointer sliding window) and attaches it to that entry's point as `weekly`/`monthly`. Result: as many weekly/monthly values as there are daily logs, each shifted slightly from its neighbor — a smoothed daily line, not a weekly/monthly aggregate. The user expects one dot per calendar week and one dot per calendar month.

All data is already loaded client-side as `Weight[]`; no new fetching is needed. `getWeeklyAverages` in `actions/weight.ts` does true `DATE_TRUNC('week', ...)` aggregation but is unused by this component and out of scope (it's for a different consumer, not the chart).

## Goals / Non-Goals

**Goals:**
- Weekly line: exactly one point per calendar week that has ≥1 log entry, value = average of that week's entries.
- Monthly line: exactly one point per calendar month that has ≥1 log entry, value = average of that month's entries.
- Daily line: unchanged (one point per log entry).
- All three series still render on one time-scaled x-axis (`type="number"`, `scale="time"`) without visually misaligning.
- Preserve existing window-preset filtering (1M/3M/6M/1Y/All) and trend footer, which currently key off `daily`.

**Non-Goals:**
- Changing the daily series' computation or the trend/footer logic beyond adapting to the new data shape.
- Server-side aggregation (`getWeeklyAverages`) — left as-is, unrelated to this fix.
- ISO week vs. local week semantics debate — pick one convention (see Decisions) and document it; not user-configurable.

## Decisions

**Separate per-series arrays instead of one merged-by-daily-point array.**
Recharts can plot multiple `<Line>`s from *different* data arrays on the same chart by giving each `<Line>` its own `data` prop (supported since Recharts v2) while sharing one `<XAxis type="number" domain={["dataMin","dataMax"]}>`. This avoids forcing weekly/monthly points onto daily timestamps (which would misrepresent when the period average "occurred"). Alternative considered: merge everything into one array keyed by date, filling weekly/monthly only on the last day of each period and `null` elsewhere with `connectNulls` on those lines — rejected because it complicates the window-filter/trend logic and produces a sparser, harder-to-reason-about array for no benefit.

**Period boundary: calendar month via `startOfMonth`/`startOfWeek` (date-fns, `weekStartsOn: 1` Monday) using each entry's local `Date`.**
Matches how a user thinks about "this week" / "this month" and matches existing use of `date-fns` in the file (`format`, `sub`, `subDays` already imported). Alternative: ISO week (`date-fns` `startOfISOWeek`) — rejected, no requirement for ISO semantics and Monday-start local week is simpler to reason about for a single-user fitness app.

**Point timestamp for an aggregated period = the period's start date** (`startOfWeek`/`startOfMonth` of the first entry in that group), not the average or last-entry date. Keeps period boundaries deterministic and stable regardless of which days within the period have logs.

**Window-preset filter and trend footer continue to operate on the daily array** (`chartData`/`visibleData` as today); weekly/monthly arrays get their own filter using the same cutoff timestamp so all three series respect the selected window consistently.

## Risks / Trade-offs

- [Multiple `data` arrays per `<Line>` inside one `<LineChart>` is a valid Recharts pattern but less common than a single shared array] → Verify visually in dev server after implementing; fall back to the merged-array-with-nulls approach if Recharts version in use doesn't support per-`Line` `data` cleanly.
- [A week/month with very few entries (e.g. 1) still renders as a full dot, which could look statistically thin] → Acceptable per requirements; no minimum-sample-size filtering requested.
- [Changing `ChartPoint` shape is a breaking change to `buildChartData`'s contract] → Only consumer is this component; grep confirms no other imports.

## Migration Plan

No data migration. Single-file (plus type) change in `components/progress-chart.tsx`, deployed as a normal commit. Rollback = revert the commit; no persisted state depends on the new shape.
