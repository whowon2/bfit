## 1. Algorithm

- [x] 1.1 Export `KCAL_PER_KG` from `lib/nutrition.ts` and use it in `calcDailyCalorieChange`
- [x] 1.2 Create `lib/adaptive-tdee.ts`: `estimateObservedTdee` (window, guards, slope via `weeklyRate`, confidence, reasons), `observedTdeeSeries`, `explainMaintenance`/reason messages
- [x] 1.3 Add `chooseMaintenance` to `lib/nutrition.ts`; make `computeCalcSnapshot` accept `observed` and base target calories/macros on the chosen maintenance; add optional `maintenance` to `CalcSnapshot`

## 2. Data loading

- [x] 2.1 Add server-only `lib/queries/adaptive-tdee.ts` returning the estimate and weekly series for a user/timezone
- [x] 2.2 Record the chosen maintenance in `createProfile`/`updateProfile` snapshots (`actions/profile.ts`)

## 3. UI

- [x] 3.1 Dashboard page: compute the estimate from loaded rows, pass it into the snapshot and the maintenance slot
- [x] 3.2 Summary strip: `MaintenanceStat` with source adaptive/blended/formula, confidence subtitle and explanation tooltip
- [x] 3.3 Profile page: formula vs observed TDEE card with weekly series; pass `observed` to the update form; history renders maintenance when present
- [x] 3.4 Update form: "Maintenance in use" tile; target/macros preview follow chosen maintenance

## 4. Docs and verification

- [x] 4.1 Update `CLAUDE.md`
- [x] 4.2 Synthetic-data sanity script (temp dir): 2500 kcal + −0.5 kg/wk ≈ 3050; flat; gaps; sparse → fallback; blend
- [x] 4.3 `bunx tsc --noEmit`, `bunx next build --turbopack`, `bunx biome check` on touched files
