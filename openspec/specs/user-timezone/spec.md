# user-timezone Specification

## Purpose
Each user has one IANA timezone, captured from the browser and editable in Settings, that the server uses for every instant-to-calendar-day decision.
## Requirements
### Requirement: User timezone is stored
The system SHALL store each user's IANA timezone name in `user.timezone`. A `null` value means "not yet detected" and SHALL be treated as `UTC`. The value MUST be a timezone accepted by `Intl.DateTimeFormat` and MUST NOT be settable through Better Auth's sign-up or update-user input.

#### Scenario: Invalid timezone rejected
- **WHEN** `updateTimezone` is called with `"Mars/Olympus"`
- **THEN** the action SHALL throw a validation error and `user.timezone` SHALL be unchanged

### Requirement: Timezone is captured from the browser
The system SHALL capture the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` at sign-up, and SHALL save it once for signed-in users whose timezone is `null`.

#### Scenario: Sign-up stores the browser timezone
- **WHEN** a user signs up from a browser in `Europe/Madrid`
- **THEN** the created user's `timezone` SHALL be `Europe/Madrid`

#### Scenario: Existing user without timezone
- **WHEN** a signed-in user with `timezone = null` loads any page from a browser in `America/New_York`
- **THEN** `user.timezone` SHALL be set to `America/New_York`

### Requirement: Timezone is visible and editable in Settings
The Settings page SHALL show the user's timezone and allow choosing any supported IANA timezone or resetting it to the browser's timezone. The change SHALL take effect on the next server action and page render.

#### Scenario: Change timezone
- **WHEN** a user selects `Asia/Tokyo` in Settings
- **THEN** `user.timezone` SHALL be `Asia/Tokyo` and subsequent "today" calculations SHALL use Tokyo's calendar day

### Requirement: Server-side day calculations use the user timezone
Every server-side conversion between an instant and a calendar day (default day for a new weight, day of an imported instant, date of birth) SHALL use the user's stored timezone, never the server's or the browser's local timezone.

#### Scenario: Late-evening weigh-in
- **WHEN** a user in `America/Los_Angeles` logs a weight at 23:30 local time on 2026-03-10 without picking a date
- **THEN** the stored `weight.date` SHALL be `2026-03-10` even though the instant is 2026-03-11 in UTC

#### Scenario: Date of birth is not shifted
- **WHEN** a user in `Europe/Berlin` saves a date of birth of 2002-02-02
- **THEN** `user_profile.birth_date` SHALL be `2002-02-02` and the form SHALL show February 2, 2002

