## ADDED Requirements

### Requirement: Calorie log rows are calendar days
`calorie_log.date` SHALL be a Postgres `date`, unique per `(user_id, date)`. The table SHALL NOT store `target_calories` or `phase`; the target in force on a day is derived from `profile_history`.

#### Scenario: Re-import updates the day
- **WHEN** a user imports an MFP CSV containing 2026-01-05 twice (two separate imports)
- **THEN** one `calorie_log` row SHALL exist for 2026-01-05 with the latest import's totals

### Requirement: MFP import is timezone-independent
The MFP parser SHALL pass each `Date` value through as a `YYYY-MM-DD` day string without constructing a `Date`, and `importCalorieEntries` SHALL reject rows whose date is not a valid `YYYY-MM-DD` day.

#### Scenario: Browser east of UTC
- **WHEN** a user whose browser is in `Europe/Madrid` imports a CSV row dated `2026-01-05`
- **THEN** the stored `calorie_log.date` SHALL be `2026-01-05`

### Requirement: Existing calorie rows are migrated to days
The migration SHALL convert each existing calorie timestamp to the day of its nearest midnight (`(date + 12 hours)::date`), keep the most recently updated row (ties: highest id) when two rows map to the same day, delete the others, and drop `target_calories` and `phase`.

#### Scenario: Local-midnight row stored as UTC
- **WHEN** an existing row's stored timestamp is `2026-01-04 23:00` (Madrid midnight of 2026-01-05)
- **THEN** after migration its `date` SHALL be `2026-01-05`
