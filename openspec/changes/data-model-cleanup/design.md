## Context

- `weight.date` and `calorie_log.date` are `timestamp without time zone`. Drizzle writes `Date.toISOString()` into them and reads them back with `+0000` appended, so the stored value is the **UTC wall clock** of the instant the browser produced. The instant is correct; the calendar day is not stored anywhere.
- "Which day" is derived ad hoc: the chart uses the browser's `startOfDay`, the weight list formats in whatever timezone renders it (server during SSR, browser after hydration), MFP CSV dates are parsed as browser-local midnight (so a UTC+1 user's "2026-01-05" is stored as `2026-01-04 23:00`), and `birthDate` is turned into a day with `toISOString()` on the server (shifting it a day for users east of UTC).
- `unique(user_id, date)` on a full timestamp does not prevent two weigh-ins per day, and `importWeightEntries`'s `onConflictDoNothing` only fires on byte-identical timestamps.
- `userProfile.maintenanceCalories` / `currentCalories` are never shown or used (the form only fills them with `0`), `goal` is stored but ignored by `lib/nutrition.ts`, and `calorieLog.targetCalories` / `phase` are never written.
- A later change adds adaptive TDEE, which needs exactly one weight and one calorie value per user per local day.

## Goals / Non-Goals

**Goals:**
- One authoritative timezone per user, used by every server-side "what day is it" decision.
- One weight entry and one calorie row per user per local calendar day, enforced by the DB.
- A deterministic, documented migration of existing rows.
- Remove stored-but-meaningless columns; make `goal` drive the math.

**Non-Goals:**
- Dashboard redesign, adaptive TDEE, multiple weigh-ins per day (e.g. averaging).
- Converting Better Auth / audit `created_at`/`updated_at` columns to `timestamptz`.
- Per-entry timezones (a user travelling keeps one timezone; they can change it in Settings).

## Decisions

### D1. Timezone: store an IANA name on `user`, server is authoritative
`user.timezone text` (nullable, `null` = not yet detected, treated as `UTC`). Captured from `Intl.DateTimeFormat().resolvedOptions().timeZone`:
- on sign-up (hidden form field; written directly after `signUpEmail` since the Better Auth field is `input: false`),
- once for existing users by a tiny client component rendered by the sidebar when the session's timezone is `null`,
- explicitly in Settings (select of `Intl.supportedValuesOf("timeZone")` plus "Use browser timezone").

Server actions read the timezone from the DB (`requireUser()` in `lib/session.ts`), not from the session cookie cache, so a freshly set value is used immediately. Timezone math uses `Intl` only (new `lib/dates.ts`): `dayInTimeZone(instant, tz)`, `todayInTimeZone(tz)`, `zonedTimeToInstant(day, "HH:mm", tz)`, `isValidTimeZone`, `parseDay` (day string → local-midnight `Date` for display/date pickers) and `formatDay` (local `Date` → day string).

*Alternatives*: browser-only timezone (inconsistent between SSR and client, and absent in server actions); storing a UTC offset (breaks across DST); adding `@date-fns/tz` (unneeded, `Intl` suffices).

### D2. `date` columns are calendar days; precise time is optional `timestamptz`
- `weight.date` → Postgres `date` (local day in the user's timezone). New `weight.measured_at timestamptz NULL` holds the instant when known.
- `calorie_log.date` → Postgres `date`. MFP rows have no meaningful time, so no `measured_at`.
- Drizzle `date` columns are read as `"YYYY-MM-DD"` strings and passed through unchanged; the client turns them into local-midnight `Date`s only for formatting/charting. The chart therefore groups by the stored day, never by `startOfDay(instant)`.
- `measured_at` rules on add: explicit time → `zonedTimeToInstant(day, time, tz)`; no time and the day is today (or no day given) → now; no time and a past day → `null` (unknown, rather than a fabricated midnight).

Keeping the column name `date` (changing its type) and adding `measured_at` avoids a drizzle-kit rename prompt and keeps the existing `weight_user_id_date_unique` / `calorie_log_user_id_date_unique` constraints, which become the per-day uniqueness.

### D3. Same-day weight: upsert (add/import), reject (edit)
- `addWeightEntry` and `importWeightEntries` use `INSERT ... ON CONFLICT (user_id, date) DO UPDATE` setting `value`, `measured_at`, and `body_fat_percent = COALESCE(excluded, existing)` (logging a weight without body fat must not wipe a body fat measured earlier that day). Rationale: the user's intent when logging again the same day is "correct today's weight"; silently ignoring (the old `DO NOTHING`) loses the newer value and erroring is hostile for imports. `addWeightEntry` returns `{ replaced }` (via `xmax <> 0`) so the UI can say "Updated today's entry".
- Within one import, rows are de-duplicated per day before the insert (latest `measuredAt` wins; Postgres cannot update the same row twice in one statement).
- `updateWeightEntry` moving an entry onto a day that already has another entry returns `{ ok: false, error }` instead of merging — the edit dialog is an explicit action on one row, and silently deleting another row would be surprising.

### D4. Import/export day resolution
- Export v2: `{ format, version: 2, unit: "kg", weights: [{ value, date: "YYYY-MM-DD", measuredAt: ISO | null, bodyFatPercent }] }`.
- Import: v2 rows carry the day → used as-is. v1 / legacy arrays carry only an ISO instant → day computed server-side in the user's timezone. Lyfta dates are naive local wall-clock strings (`"2026-04-01 14:36:27"`) → the day is the string's date part, the instant is the browser-local parse.
- MFP CSV `Date` values (`YYYY-MM-DD`) are sent as day strings; no `Date` construction.

### D5. Migration backfill and dedupe (`0007`)
Single migration, hand-edited after `drizzle-kit generate`, executed in drizzle's migration transaction:
1. `user.timezone` added (nullable).
2. Backfill timezone `tz := COALESCE(NULLIF(current_setting('bfit.backfill_timezone', true), ''), 'UTC')`. Operators can pass the real timezone with `PGOPTIONS="-c bfit.backfill_timezone=Europe/Madrid" bunx drizzle-kit migrate`; if given, it is also written to `user.timezone` for users that have none. Default `UTC` because the DB has no knowledge of the user's location; the user is told to set it via the operator option if known.
3. `weight.measured_at := date AT TIME ZONE 'UTC'` (stored values are UTC wall clock, see Context).
4. Day for each weight = `(measured_at AT TIME ZONE tz)::date`. **Dedupe**: per `(user_id, day)` keep the row with the latest `measured_at` (ties: highest `id`); before deleting the others, the keeper's `body_fat_percent` is filled with the latest non-null body fat of that day if it has none. Other rows of that day are **deleted**.
5. `weight.date` type → `date` using the day expression; default removed.
6. Calorie day = `(date + interval '12 hours')::date` (round to nearest midnight). Every existing row was written by the MFP import as browser-local midnight, so its UTC wall clock is local midnight minus the UTC offset; rounding recovers the local day for any offset within ±12h, independent of the backfill timezone. Duplicate days (possible only if the same CSV was imported from browsers in different timezones) keep the most recently updated row (ties: highest `id`), others are deleted.
7. Drop `calorie_log.target_calories`, `calorie_log.phase`, `user_profile.maintenance_calories`, `user_profile.current_calories`.

*Alternatives for weights*: keep the earliest (morning) weigh-in — more "fasted", but the latest reflects the user's most recent correction and matches the new upsert semantics; averaging — invents a value that was never measured.

### D6. Profile field removal
`maintenanceCalories`/`currentCalories` are dropped (form, schema, DB). Adaptive TDEE will compute maintenance from data, so a stored guess would be a second, conflicting source of truth. `calorieLog.targetCalories`/`phase` are dropped: the target in force on any day is derivable from `profile_history.calcAfter` + `created_at`, and backfilling imports with today's target would be wrong. Profile history keeps labels for removed fields so old entries still render.

### D7. Goal semantics
In `computeCalcSnapshot`: `maintain` → `dailyCalorieChange = 0`; `cut` → `min(change, 0)`; `bulk` → `max(change, 0)`. A shared `goalConflict({ goal, currentBodyFat, targetBodyFat })` returns a message when `cut` has target ≥ current or `bulk` has target ≤ current (only when current body fat is known). The profile forms show it inline on the target-body-fat field and block submit; `createProfile`/`updateProfile` re-check against the latest measured body fat and throw. The clamp guarantees existing or later-conflicting profiles (e.g. after a new body-fat reading) never get a wrong-direction target; the profile page shows the conflict warning.

*Alternative*: derive goal from target vs current body fat — impossible when no body fat is logged, and loses "maintain".

## Risks / Trade-offs

- [Same-day weights are deleted by the migration] → deterministic "latest wins" rule with body-fat carry-over; called out in proposal and report; a DB backup before migrating is recommended.
- [Backfill timezone defaults to UTC] → weigh-ins logged between local midnight and the UTC offset may land on the adjacent day (and could then be deduped with it). Mitigation: `bfit.backfill_timezone` option; Neon/pgbouncer poolers may reject startup options, in which case use the direct (non-pooled) connection string for the migration.
- [Calorie rounding fails for offsets ≥ 12h (e.g. Pacific/Auckland in DST)] → accepted; documented.
- [Changing `user.timezone` does not move existing rows] → days are a fact recorded at entry time; documented in Settings copy.
- [Drizzle `date` strings vs `Date`] → TypeScript types catch every former `.getTime()` use.

## Migration Plan

1. Back up the database.
2. Deploy; `drizzle-kit migrate` runs `0007` (optionally with `PGOPTIONS="-c bfit.backfill_timezone=<IANA>"`).
3. On first page load the browser timezone is saved for users still at `null`.
Rollback: restore the backup (dropped columns and deduped rows are not recoverable from the schema alone).

## Open Questions

- Should a timezone change offer to re-bucket existing weights? (Not now.)
- Should the backfill timezone be inferred from calorie rows' offsets? (Rejected for complexity; revisit if UTC backfill proves wrong in practice.)
