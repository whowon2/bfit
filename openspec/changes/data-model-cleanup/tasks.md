## 1. Schema and migration

- [x] 1.1 Update `db/schema.ts`: `user.timezone`; `weight.date` → `date`, add `weight.measuredAt` timestamptz nullable; `calorieLog.date` → `date`; drop `calorieLog.targetCalories`/`phase`, `userProfile.maintenanceCalories`/`currentCalories`
- [x] 1.2 Run `bunx drizzle-kit generate` and hand-edit the SQL: backfill timezone setting, `measured_at` backfill, weight dedupe with body-fat carry-over, `date` type conversions, calorie nearest-midnight backfill + dedupe, column drops
- [x] 1.3 Check the journal/snapshot are consistent with the edited SQL

## 2. Timezone foundation

- [x] 2.1 Add `lib/dates.ts` (`isValidTimeZone`, `dayInTimeZone`, `todayInTimeZone`, `zonedTimeToInstant`, `formatInstantTime`, `parseDay`, `formatDay`, `isDayString`)
- [x] 2.2 Register `timezone` as a Better Auth `input: false` field; add `requireUser()` (id + DB timezone) and `getUserTimeZone` query
- [x] 2.3 Add `updateTimezone` server action (validated, refreshes session cookie cache)
- [x] 2.4 Capture browser timezone on sign-up (hidden field → write after `signUpEmail`)
- [x] 2.5 Add `TimezoneSync` client component, rendered by the sidebar when the session timezone is null
- [x] 2.6 Settings: show/edit timezone (select + "Use browser timezone")

## 3. Weights

- [x] 3.1 `actions/weight.ts`: add = upsert per day with `{ replaced }` result, body fat COALESCE, measured_at rules; import = resolve day, dedupe in payload, upsert; update = day/time in user tz, reject occupied day with `{ ok: false, error }`
- [x] 3.2 `lib/queries/weight.ts`: order by `date` then `measured_at`
- [x] 3.3 `lib/weight-import.ts` / `lib/lyfta.ts`: v2 export format, day/instant rows, Lyfta wall-clock day
- [x] 3.4 Components: add-weight (day string + time, toast on replace), edit-weight (day + optional time in user tz, error toast), weight-list (stored day, time in user tz), export-json (v2), dashboard passes timezone

## 4. Calories

- [x] 4.1 `lib/mfp.ts` returns day strings; `actions/calorie.ts` validates `YYYY-MM-DD`
- [x] 4.2 Progress chart keys rows by stored day (`parseDay`), no `startOfDay` on instants

## 5. Profile and goal

- [x] 5.1 Remove maintenance/current calories from `lib/profile-schema.ts`, forms and `actions/profile.ts`
- [x] 5.2 `lib/nutrition.ts`: goal-direction clamp in `computeCalcSnapshot`, `goalConflict` helper
- [x] 5.3 Forms: inline goal/target conflict error + block submit; actions re-check with latest body fat
- [x] 5.4 Birth date stored/displayed as a calendar day (user tz on server, `parseDay` on client)
- [x] 5.5 Profile page: legacy field labels kept, conflict warning shown

## 6. Docs and verification

- [x] 6.1 Update CLAUDE.md (timezone strategy, day columns, upsert, removed fields, export v2)
- [x] 6.2 `bunx tsc --noEmit`, `bunx next build --turbopack`, `bunx biome check` on touched files
