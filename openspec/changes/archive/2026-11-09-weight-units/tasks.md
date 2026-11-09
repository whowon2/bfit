## 1. Units core

- [x] 1.1 Create `lib/units.ts` (`WeightUnit`, `LB_IN_KG`, `toWeightUnit`, `kgToUnit`, `unitToKg`, `toStoredKg`, `displayWeight`)

## 2. Session

- [x] 2.1 `lib/auth.ts`: add `user.additionalFields.weightUnit` (`input: false`, default `kg`), remove hardcoded `customSession`
- [x] 2.2 `actions/settings.ts`: after update, refresh cookie cache via `getSession({ query: { disableCookieCache: true } })`; revalidate `/profile` too
- [x] 2.3 Use `toWeightUnit(session.user.weightUnit)` in dashboard, settings and profile pages

## 3. Display edges

- [x] 3.1 `components/progress-chart.tsx`: convert series and trend delta to the user's unit; type `unit` as `WeightUnit`
- [x] 3.2 `components/weight-list.tsx`: entries and month averages/diffs in the user's unit; pass unit to form/import/export children
- [x] 3.3 `app/profile/update-form.tsx` + `app/profile/page.tsx`: "Based on" weight shown in the user's unit; nutrition stays kg

## 4. Input edges

- [x] 4.1 `components/add-weight.tsx`: convert input to kg; placeholder shows the unit
- [x] 4.2 `components/edit-weight.tsx`: prefill in the user's unit, convert on save, preserve stored kg when the value is unchanged

## 5. Import / export

- [x] 5.1 `lib/lyfta.ts`: convert measures by `unit` to kg
- [x] 5.2 `lib/weight-import.ts`: `parseWeightImport` for Lyfta, BFit object, and legacy array formats
- [x] 5.3 `components/import-weights.tsx`: use `parseWeightImport`
- [x] 5.4 `components/export-json.tsx`: export `{ format: "bfit-weights", version: 1, unit: "kg", weights }`

## 6. Verify & docs

- [x] 6.1 Update CLAUDE.md (auth section: additionalFields instead of customSession; units convention)
- [x] 6.2 `bunx tsc --noEmit`, `bunx next build --turbopack`, `bunx biome check` on touched files
