## 1. Progress chart

- [x] 1.1 Build merged chart rows and `xDomain` from visible series only, falling back to all series when none are visible
- [x] 1.2 Calorie YAxis: `niceDomain(0, max, 4)` domain/ticks with thousands-separator formatter

## 2. Coverage wording

- [x] 2.1 Add `formatCoverage` helper in `lib/adaptive-tdee.ts` and use it in `explainMaintenance`
- [x] 2.2 Relabel summary strip, profile page and profile form note to "data coverage"

## 3. Layout

- [x] 3.1 Move `suppressHydrationWarning` from `<body>` to `<html>` in `app/layout.tsx`

## 4. Verify

- [x] 4.1 `bunx tsc --noEmit`, `bunx next build --turbopack`, `bunx biome check` on touched files
