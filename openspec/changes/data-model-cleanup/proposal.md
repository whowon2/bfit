## Why

The data model has drifted from what the app actually needs. `weight` is unique on `(user_id, timestamp)`, so the "one entry per day" intent is not enforced and re-imports duplicate rows; dates are stored as `timestamp without time zone` and bucketed into days with whatever timezone the browser or server happens to run in; and several profile/calorie columns are stored but never used (or used inconsistently, like `goal`). The upcoming adaptive-TDEE work needs a trustworthy "one weight + one calorie row per user per local day" foundation.

## What Changes

- Add `user.timezone` (IANA name). Captured from the browser on sign-up and auto-detected once for existing users; visible and editable in Settings. All per-day logic on the server uses it.
- **BREAKING (schema)** `weight.date` becomes a Postgres `date` (the user's local calendar day) and the precise weigh-in instant moves to a new nullable `weight.measured_at timestamptz`. `unique(user_id, date)` now means one entry per user per local day.
- Adding or importing a weight for a day that already has an entry updates that entry (upsert). Editing an entry onto a day that already has another entry is rejected with a clear error.
- **BREAKING (schema)** `calorie_log.date` becomes a Postgres `date`. MFP CSV dates are kept as calendar-day strings end to end (no local-midnight `Date` parsing).
- **Data migration**: existing weights are backfilled into the day column; where a user has several weights on the same day, the latest one is kept (its body fat falls back to the latest non-null body fat of that day) and the others are **deleted**. Existing calorie rows are mapped to the day of their nearest midnight; same-day duplicates keep the most recently updated row.
- **BREAKING (schema)** Drop `user_profile.maintenance_calories`, `user_profile.current_calories`, `calorie_log.target_calories`, `calorie_log.phase` (never used in calculations / never written).
- Make `goal` meaningful: `maintain` yields no surplus/deficit, `cut` never yields a surplus and `bulk` never yields a deficit. The profile form and `createProfile`/`updateProfile` reject a target body fat that contradicts the goal given the latest body-fat measurement.
- JSON export bumped to version 2 (`date` = calendar day, `measuredAt` = instant or null); version 1 and Lyfta imports keep working.
- Profile history keeps rendering old entries that mention removed fields.
- Date-of-birth is stored/displayed as a calendar day without timezone shifting.
- Update CLAUDE.md.

## Capabilities

### New Capabilities
- `user-timezone`: the user's IANA timezone is stored, captured from the browser, editable in Settings, and is the single source of truth for "which calendar day" on the server.
- `daily-weight-log`: at most one weight entry per user per local calendar day, upsert on add/import, precise time optional, migration/dedupe of existing data.
- `calorie-log-days`: calorie log rows are keyed by calendar day; MFP import is timezone-independent.
- `nutrition-goal`: goal (cut/bulk/maintain) determines the direction of the calorie change and is validated against target body fat; unused stored-but-ignored inputs are removed.

### Modified Capabilities
- `weight-units`: export format becomes version 2 with calendar-day `date` and `measuredAt`; legacy formats still import.

## Impact

- `db/schema.ts`, new migration `migrations/0007_*.sql` (hand-edited data backfill/dedupe), drizzle snapshot/journal.
- `actions/weight.ts`, `actions/calorie.ts`, `actions/profile.ts`, `actions/settings.ts`, `actions/auth.ts`, `lib/session.ts`, `lib/auth.ts`, new `lib/dates.ts`, `lib/queries/*`, `lib/mfp.ts`, `lib/lyfta.ts`, `lib/weight-import.ts`, `lib/nutrition.ts`, `lib/profile-schema.ts`.
- Components: add/edit weight, weight list, export, progress chart, profile forms + page, settings page, sidebar (timezone auto-detect), sign-up form.
- No new dependencies (timezone math uses `Intl`).
