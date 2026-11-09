## Why

A manual browser smoke test found four rough edges: the progress chart's x-axis stretches to include hidden series (leaving empty space), the calorie panel's y-axis shows odd raw ticks ("2661", "900"), the adaptive-TDEE "95% confidence" label implies a statistical confidence interval when it is really a data-coverage score, and every page logs a hydration warning because next-themes mutates `<html>`.

## What Changes

- Progress chart x-axis domain (and merged chart rows) include only currently visible series; fall back to all series when none are visible.
- Calorie panel y-axis uses nice rounded ticks (via `niceDomain`, starting at 0) formatted with thousands separators.
- User-facing "N% confidence" wording for the adaptive TDEE becomes "N% data coverage" (summary strip, profile page, explanation tooltip, profile form note). Algorithm unchanged.
- `suppressHydrationWarning` moves from `<body>` to `<html>` in `app/layout.tsx`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `progress-chart-averages`: x-axis spans only visible series; calorie axis uses nice ticks.
- `adaptive-tdee`: the confidence score is presented to users as "data coverage".

## Impact

`components/progress-chart.tsx`, `components/summary-strip.tsx`, `lib/adaptive-tdee.ts`, `app/profile/page.tsx`, `app/profile/update-form.tsx`, `app/layout.tsx`. No schema, API or data changes.
