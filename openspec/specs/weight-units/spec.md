# weight-units Specification

## Purpose
Users choose kg or lbs for body weight; weights are stored canonically in kg, the preference is exposed on the session and takes effect immediately, and values are converted only at display, input, import and export edges.
## Requirements
### Requirement: Session exposes the saved weight unit
The session user object SHALL carry the user's persisted `weightUnit` (`"kg"` or `"lbs"`) read from `user.weight_unit`, and the value MUST NOT be settable through Better Auth's sign-up or update-user input.

#### Scenario: Saved lbs preference reaches the session
- **WHEN** a user whose `user.weight_unit` is `lbs` loads any page that calls `auth.api.getSession`
- **THEN** `session.user.weightUnit` SHALL be `"lbs"`

#### Scenario: Unit cannot be set at sign-up
- **WHEN** a sign-up request body includes `weightUnit: "lbs"`
- **THEN** the created user SHALL have the default unit `kg`

### Requirement: Changing the unit takes effect immediately
After `updateWeightUnit` succeeds, the next render of Settings, Dashboard and Profile SHALL use the new unit, without waiting for the session cookie cache to expire.

#### Scenario: Settings select reflects the saved value
- **WHEN** a user switches the Settings weight unit select from kg to lbs
- **THEN** after the refresh the select SHALL show `lbs`, and reloading the page SHALL still show `lbs`

### Requirement: Weights are stored in kilograms
The system SHALL persist every weight value in kilograms regardless of the user's selected unit, and weight server actions SHALL accept values in kilograms only.

#### Scenario: Logging a weight in lbs
- **WHEN** a user with unit `lbs` adds an entry of `180` in the add-weight form
- **THEN** the stored `weight.value` SHALL be `81.65` (180 x 0.45359237, rounded to 2 decimals)

#### Scenario: Changing unit does not modify stored data
- **WHEN** a user switches unit from kg to lbs
- **THEN** no `weight` rows SHALL be modified

### Requirement: Weights are displayed in the user's unit
Every body-weight value shown to the user (progress chart series and tooltip, trend footer delta, weight list entries, month averages and month-over-month diffs, edit dialog prefill, profile "Based on" weight) SHALL be converted from kg to the user's unit and labelled with that unit. Values in lbs SHALL be shown with 1 decimal; values in kg with up to 2 decimals.

#### Scenario: Weight list in lbs
- **WHEN** a user with unit `lbs` has a stored entry of `80.00` kg
- **THEN** the weight list SHALL show `176.4 lbs`

#### Scenario: Editing without changing the value preserves the stored kg
- **WHEN** a user with unit `lbs` opens the edit dialog for an entry and saves without changing the weight field
- **THEN** the stored kg value SHALL remain exactly unchanged

### Requirement: Imports are normalized to kilograms
Weight imports SHALL convert values to kg based on the source's declared unit before calling `importWeightEntries`. Lyfta exports with `unit: "lbs"` SHALL be converted; a BFit export SHALL be converted according to its `unit` field; a plain JSON array (legacy BFit export) SHALL be treated as kg.

#### Scenario: Lyfta export in lbs
- **WHEN** a user imports a Lyfta export with `unit: "lbs"` and a measure of `200`
- **THEN** the stored value SHALL be `90.72` kg

#### Scenario: Legacy plain array
- **WHEN** a user imports a JSON array of `{ value, date, bodyFatPercent }` objects
- **THEN** the values SHALL be stored as-is in kg, independent of the user's selected unit

### Requirement: Export is self-describing
The JSON export SHALL be an object `{ format: "bfit-weights", version: 2, unit: "kg", weights: [...] }` with weight values in kg, where each weight has `date` (calendar day `YYYY-MM-DD`), `measuredAt` (ISO instant or `null`) and `bodyFatPercent`, so a re-import is unambiguous regardless of the importing user's unit or timezone. Version 1 exports (instant-only `date`) SHALL still import, with the day derived in the importing user's timezone.

#### Scenario: Round-trip export and import
- **WHEN** a user with unit `lbs` exports their weights and another user with unit `kg` imports that file
- **THEN** the imported kg values SHALL equal the exported kg values

#### Scenario: Round-trip keeps calendar days
- **WHEN** a user exports weights and a user in a different timezone imports the file
- **THEN** every imported row SHALL have the same `date` as in the export

### Requirement: Nutrition calculations use kilograms
BMR, target weight, and macro calculations SHALL use the latest weight in kg, independent of the selected display unit; only the displayed weight label converts.

#### Scenario: Same targets in either unit
- **WHEN** a user switches unit between kg and lbs
- **THEN** the profile's calorie and macro numbers SHALL be identical in both units

