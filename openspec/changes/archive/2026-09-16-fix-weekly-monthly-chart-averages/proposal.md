## Why

The progress chart's "Weekly" and "Monthly" lines are computed as a per-entry trailing rolling average (recomputed at every daily log point), not as one aggregated value per calendar week/month. This makes the lines look like they're showing "how each day pulls the monthly average," with a dot for every log entry instead of one dot per week/month — the opposite of what "weekly average" / "monthly average" should mean.

## What Changes

- Replace the trailing rolling-average computation in `buildChartData` (`components/progress-chart.tsx`) with true per-period aggregation: one data point per calendar week (or ISO week) for the weekly series, one data point per calendar month for the monthly series.
- Weekly/monthly lines render with exactly one dot per period, connected across periods — not one dot per daily log entry.
- Daily series is unaffected (still one point per log entry).
- Chart merges the three series (daily / weekly / monthly) onto a shared timestamp-scaled x-axis without stretching or misaligning the aggregated series relative to daily points.
- **BREAKING**: `ChartPoint` shape changes — weekly/monthly values are no longer present on every daily point; consumers of `buildChartData` (if any exist beyond this component) must be updated.

## Capabilities

### New Capabilities
- `progress-chart-averages`: Computing and rendering daily/weekly/monthly weight averages on the progress chart, including period-boundary aggregation rules and how the three series are merged onto one time-scaled chart.

### Modified Capabilities
(none — no existing specs)

## Impact

- `components/progress-chart.tsx`: `buildChartData` rewritten; `ChartPoint` type and `Line` rendering for weekly/monthly adjusted.
- No server/DB changes required — aggregation stays client-side over the same `Weight[]` data already fetched (the existing `getWeeklyAverages` server action in `actions/weight.ts` is unrelated/unused by this component and is out of scope).
