## ADDED Requirements

### Requirement: One weight entry per user per local day
The `weight` table SHALL store the entry's calendar day in a Postgres `date` column `date`, enforced unique per `(user_id, date)`, and SHALL store the precise weigh-in instant, when known, in a nullable `timestamptz` column `measured_at`.

#### Scenario: Two weigh-ins the same day
- **WHEN** a user logs 80.0 kg at 07:00 and 79.6 kg at 21:00 on the same local day
- **THEN** exactly one `weight` row SHALL exist for that day, with value 79.6 and `measured_at` at 21:00 local

### Requirement: Adding a weight for an existing day updates it
`addWeightEntry` SHALL upsert on `(user_id, date)`: the existing row's value and `measured_at` are replaced, and its body fat is replaced only when the new entry provides one. The action SHALL report whether an existing entry was replaced, and the UI SHALL tell the user.

#### Scenario: Re-log without body fat keeps earlier body fat
- **WHEN** a day's entry has 18% body fat and the user adds a new weight for that day without body fat
- **THEN** the row SHALL have the new weight and still 18% body fat, and the UI SHALL show that today's entry was updated

#### Scenario: Default day and time
- **WHEN** a user adds a weight without choosing a date or time
- **THEN** `date` SHALL be today in the user's timezone and `measured_at` SHALL be the current instant

#### Scenario: Past day without time
- **WHEN** a user adds a weight for a past day without a time
- **THEN** `measured_at` SHALL be `null`

### Requirement: Importing weights upserts per day
`importWeightEntries` SHALL resolve each row to a calendar day (explicit day if present, otherwise the instant converted in the user's timezone), keep only the latest row per day within the payload, and upsert on `(user_id, date)` with the same rules as adding.

#### Scenario: Re-import with different times
- **WHEN** a user imports a file containing 2026-04-01 08:00 and later imports another file containing 2026-04-01 14:36 for the same local day
- **THEN** one row SHALL exist for 2026-04-01 with the second file's value

#### Scenario: Same day twice in one file
- **WHEN** an import payload contains two rows on the same local day
- **THEN** the import SHALL succeed and store the row with the later instant

### Requirement: Editing onto an occupied day is rejected
`updateWeightEntry` SHALL return an error result, and write nothing, when the new day already has a different entry for the user.

#### Scenario: Move entry onto existing day
- **WHEN** a user edits the 2026-04-02 entry and changes its date to 2026-04-01, which already has an entry
- **THEN** the action SHALL return `{ ok: false }` with a message and both rows SHALL be unchanged

### Requirement: Existing weights are migrated deterministically
The migration SHALL backfill `measured_at` from the old timestamp (interpreted as UTC) and `date` as the local day of that instant in the backfill timezone (`bfit.backfill_timezone` setting, default `UTC`). For each user and day with several rows it SHALL keep the row with the latest `measured_at` (ties: highest id), fill the keeper's missing body fat with the latest non-null body fat of that day, and delete the other rows.

#### Scenario: Duplicate day in existing data
- **WHEN** existing data has rows at 2026-04-01 07:00 (80.0 kg, 18% BF) and 2026-04-01 21:00 (79.6 kg, no BF) for one user
- **THEN** after migration exactly one row SHALL remain for 2026-04-01 with 79.6 kg and 18% body fat

### Requirement: Weight list shows days and optional times in the user timezone
The weight list SHALL group and label entries by their stored calendar day and SHALL show the time of day, formatted in the user's timezone, only when `measured_at` is known.

#### Scenario: Entry without time
- **WHEN** an entry has `measured_at = null`
- **THEN** the list SHALL show only its date
