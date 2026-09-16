## 1. Data layer: per-period aggregation

- [x] 1.1 In `components/progress-chart.tsx`, replace the rolling-window logic in `buildChartData` with three separate builders: `buildDailyPoints(weights)`, `buildWeeklyPoints(weights)`, `buildMonthlyPoints(weights)`.
- [x] 1.2 `buildWeeklyPoints`: group sorted entries by `startOfWeek(date, { weekStartsOn: 1 })`, one output point per group `{ date: groupStart.getTime(), value: average of group }`.
- [x] 1.3 `buildMonthlyPoints`: group sorted entries by `startOfMonth(date)`, one output point per group `{ date: groupStart.getTime(), value: average of group }`.
- [x] 1.4 Round averaged values to 2 decimals (reuse existing rounding approach) to avoid float drift.
- [x] 1.5 Update/replace the `ChartPoint` type: daily points keep `{ date, daily }` shape; introduce a shared `{ date: number; value: number }` shape for weekly/monthly points.

## 2. Chart rendering

- [x] 2.1 Update `Chart` component state/memoization to compute `dailyData`, `weeklyData`, `monthlyData` independently from `weights` (each memoized separately).
- [x] 2.2 Apply the window-preset cutoff (currently computed from the daily series' last point) to `weeklyData`/`monthlyData` as well, filtering each by the same cutoff timestamp.
- [x] 2.3 Give each `<Line>` its own `data` prop (`dailyData`/`weeklyData`/`monthlyData`) instead of a single shared `data` array on `<LineChart>`; keep `dataKey` pointing at each array's value field (`daily` for daily, `value` for weekly/monthly).
- [x] 2.4 Verify the shared `<XAxis type="number" domain={["dataMin","dataMax"]} scale="time">` still spans the full range across all three series (adjust domain calculation if Recharts doesn't auto-union domains across per-`Line` data). Explicit `xDomain` computed as min/max across all three visible arrays, passed to `XAxis domain`.
- [x] 2.5 Re-enable dots for weekly/monthly lines if desired (currently `dot={false}`) now that each dot represents a real period — confirm with visual check, keep off if visually noisy. Enabled `dot={{ r: 3 }}`.

## 3. Trend footer

- [x] 3.1 Confirm `trend` calculation still reads from the daily series (`visibleData`/`dailyData`) unchanged; adjust variable names only as needed after the split.

## 4. Verification

- [x] 4.1 Run `bun dev`, open the dashboard, and manually verify: toggling to "Monthly" only shows one dot per calendar month; toggling to "Weekly" shows one dot per calendar week. Verified via standalone aggregation script (dashboard is auth-gated; user accepted skipping live browser check).
- [x] 4.2 Verify window presets (1M/3M/6M/1Y/All) still filter all three series consistently. Filter logic shares one `cutoff` applied to all three series (code review, not live browser check).
- [x] 4.3 Run `bun run lint` and fix any Biome issues introduced.
