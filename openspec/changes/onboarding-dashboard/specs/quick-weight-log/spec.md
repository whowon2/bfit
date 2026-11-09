## ADDED Requirements

### Requirement: Prominent quick log on the dashboard
The dashboard SHALL show a weight log form at the top of the page (first on mobile), prefilled with the latest logged weight converted to the user's unit, with an optional body fat field, that logs for today in the user's timezone by default.

#### Scenario: Log today with one tap
- **WHEN** a user with a latest weight of 80.0 kg (unit kg) opens the dashboard and presses "Log today"
- **THEN** an entry of 80.0 kg SHALL be upserted for today's date in the user's timezone

#### Scenario: Unit lbs prefill
- **WHEN** the user's unit is lbs and the latest weight is 80.0 kg
- **THEN** the input SHALL be prefilled with 176.4

### Requirement: Quick log respects one entry per day
Logging from the quick log SHALL use the existing per-day upsert and SHALL tell the user whether it created a new entry or updated the day's existing entry. When today is already logged, the action label SHALL read "Update today".

#### Scenario: Already logged today
- **WHEN** today already has an entry and the user logs again
- **THEN** the day's entry SHALL be replaced and a toast SHALL say today's entry was updated

### Requirement: Logging another day
The quick log SHALL offer an "another day" option that reveals a date picker (defaulting to today in the user's timezone) and optional time.

#### Scenario: Backfill yesterday
- **WHEN** the user picks yesterday and logs a weight
- **THEN** the entry SHALL be stored for yesterday's date
