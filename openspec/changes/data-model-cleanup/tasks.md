## 1. Schema and migration

- [ ] 1.1 Update `db/schema.ts`: `user.timezone`; `weight.date` → `date`, add `weight.measuredAt` timestamptz nullable; `calorieLog.date` → `date`; drop `calorieLog.targetCalories`/`phase`, `userProfile.maintenanceCalories`/`currentCalories`
- [ ] 1.2 Run `bunx drizzle-kit generate` and hand-edit the SQL: backfill timezone setting, `measured_at` backfill, weight dedupe with body-fat carry-over, `date` type conversions, calorie nearest-midnight backfill + dedupe, column drops
- [ ] 1.3 Check the journal/snapshot are consistent with the edited SQL

## 2. Timezone foundation

- [ ] 2.1 Add `lib/dates.ts` (`isValidTimeZone`, `dayInTimeZone`, `todayInTimeZone`, `zonedTimeToInstant`, `formatInstantTime`, `parseDay`, `formatDay`, `isDayString`)
- [ ] 2.2 Register `timezone` as a Better Auth `input: false` field; add `requireUser()` (id + DB timezone) and `getUserTimeZone` query
- [ ] 2.3 Add `updateTimezone` server action (validated, refreshes session cookie cache)
- [ ] 2.4 Capture browser timezone on sign-up (hidden field → write after `signUpEmail`)
- [ ] 2.5 Add `TimezoneSync` client component, rendered by the sidebar when the session timezone is null
- [ ] 2.6 Settings: show/edit timezone (select + "Use browser timezone")

## 3. Weights

- [ ] 3.1 `actions/weight.ts`: add = upsert per day with `{ replaced }` result, body fat COALESCE, measured_at rules; import = resolve day, dedupe in payload, upsert; update = day/time in user tz, reject occupied day with `{ ok: false, error }`
- [ ] 3.2 `lib/queries/weight.ts`: order by `date` then `measured_at`
- [ ] 3.3 `lib/weight-import.ts` / `lib/lyfta.ts`: v2 export format, day/instant rows, Lyfta wall-clock day
- [ ] 3.4 Components: add-weight (day string + time, toast on replace), edit-weight (day + optional time in user tz, error toast), weight-list (stored day, time in user tz), export-json (v2), dashboard passes timezone

## 4. Calories

- [ ] 4.1 `lib/mfp.ts` returns day strings; `actions/calorie.ts` validates `YYYY-MM-DD`
- [ ] 4.2 Progress chart keys rows by stored day (`parseDay`), no `startOfDay` on instants

## 5. Profile and goal

- [ ] 5.1 Remove maintenance/current calories from `lib/profile-schema.ts`, forms and `actions/profile.ts`
- [ ] 5.2 `lib/nutrition.ts`: goal-direction clamp in `computeCalcSnapshot`, `goalConflict` helper
- [ ] 5.3 Forms: inline goal/target conflict error + block submit; actions re-check with latest body fat
- [ ] 5.4 Birth date stored/displayed as a calendar day (user tz on server, `parseDay` on client)
- [ ] 5.5 Profile page: legacy field labels kept, conflict warning shown

## 6. Docs and verification

- [ ] 6.1 Update CLAUDE.md (timezone strategy, day columns, upsert, removed fields, export v2)
- [ ] 6.2 `bunx tsc --noEmit`, `bunx next build --turbopack`, `bunx biome check` on touched files
