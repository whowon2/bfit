## Context

Small UI polish from a smoke test. See proposal for the four issues.

## Goals / Non-Goals

**Goals:** correct x-axis extent, readable calorie ticks, honest coverage wording, no hydration warning.

**Non-Goals:** changing the adaptive-TDEE algorithm, thresholds or stored field names (`confidence` stays as the internal name).

## Decisions

- **Visible-only rows, not just domain.** Recharts widens an explicit numeric domain to fit the data unless `allowDataOverflow` is set, so hidden series are also left out of the merged `chartData` rows (both panels share those rows, so sync indices stay aligned). Hidden series aren't drawn, so dropping their rows loses nothing. If nothing is visible, all series are used as before.
- **Calorie ticks via `niceDomain(0, max, 4)`** instead of `[0, "dataMax"]` + `tickCount`, reusing the weight axis helper; ticks formatted with `toLocaleString()`.
- **Wording: "N% data coverage"** everywhere (one helper `formatCoverage` in `lib/adaptive-tdee.ts`), rather than qualitative high/medium/low, so the number stays visible and consistent with the 75% threshold in the explanation.
- **`suppressHydrationWarning` on `<html>` only**; body has no client-mutated attributes.

## Risks / Trade-offs

- [Toggling a series now changes the x-range] → Intended; the axis reflects what is shown.
