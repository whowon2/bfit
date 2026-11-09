## ADDED Requirements

### Requirement: Observed TDEE from intake and weight change
The system SHALL estimate observed maintenance calories over a rolling window of the 28 calendar days ending yesterday in the user's timezone (today's intake is still in progress and is excluded) as `average daily intake − (weight slope in kg/day × 7700 kcal/kg)`, where the average is taken over logged calorie days only and the weight slope is the least-squares slope of the weigh-ins inside the window. When the user's first weigh-in or calorie day falls inside the window, the window SHALL start at that day.

#### Scenario: Steady loss on constant intake
- **WHEN** every day of the window has 2500 kcal logged and daily weights fall exactly 0.5 kg per week
- **THEN** the observed TDEE SHALL be ≈ 3050 kcal (2500 + 0.5 / 7 × 7700)

#### Scenario: Stable weight
- **WHEN** intake averages 2200 kcal and weight is flat across the window
- **THEN** the observed TDEE SHALL be ≈ 2200 kcal

### Requirement: Missing days are not zero
Days without a calorie row, and days whose logged calories are below 400 kcal (treated as incomplete logs), SHALL be excluded from the intake average rather than counted as 0 kcal. Missing weigh-ins SHALL simply be absent from the slope fit.

#### Scenario: Gaps in calorie logging
- **WHEN** 20 of 28 window days have 2500 kcal logged and 8 days have no row
- **THEN** the average intake SHALL be 2500 kcal, not 1786 kcal

### Requirement: Minimum data guards
The estimate SHALL be unavailable, with a machine-readable reason, when any of the following holds: the effective window is shorter than 14 days; fewer than 10 calorie days are logged in it; logged days cover less than 60% of the window; there are fewer than 5 weigh-ins in it or they span fewer than 10 days; or the result lies outside 1000–6000 kcal (implausible, likely incomplete logging).

#### Scenario: Sparse calorie logging
- **WHEN** only 6 calorie days are logged in the window
- **THEN** the estimate SHALL be unavailable with reason `few-intake-days`

#### Scenario: Too few weigh-ins
- **WHEN** the window has 3 weigh-ins
- **THEN** the estimate SHALL be unavailable with reason `few-weigh-ins`

### Requirement: Confidence score
An available estimate SHALL carry a confidence in [0, 1] equal to the product of `min(1, windowDays / 28)`, `min(1, intakeCoverage / 0.9)` and `min(1, weighIns / 14)`, plus its window (start, end, days), logged intake days, weigh-in count, average intake and weekly weight rate.

#### Scenario: Complete data
- **WHEN** all 28 days have calories and a weigh-in
- **THEN** the confidence SHALL be 1

### Requirement: Maintenance source selection
The maintenance that drives targets SHALL be chosen as: `adaptive` (the observed estimate) when an estimate is available and its confidence is at least 0.75 or no formula TDEE exists; `blended` (`confidence × observed + (1 − confidence) × formula`) when available with lower confidence; `formula` otherwise, carrying the unavailable reason.

#### Scenario: Low confidence blend
- **WHEN** the observed estimate is 3000 kcal with confidence 0.5 and the formula TDEE is 2600 kcal
- **THEN** maintenance SHALL be 2800 kcal with source `blended`

#### Scenario: Fallback
- **WHEN** the estimate is unavailable
- **THEN** maintenance SHALL be the formula TDEE with source `formula` and the reason SHALL be shown to the user

### Requirement: Weekly observed series
The system SHALL compute the observed estimate as of the end of each of the last 8 weeks (window ending 7·k days before yesterday) for display, with unavailable weeks shown as missing.

#### Scenario: New user
- **WHEN** the user has 3 weeks of data
- **THEN** only the most recent weeks with enough data SHALL show a value; earlier weeks SHALL show as unavailable

### Requirement: Profile page compares formula and observed TDEE
The profile page SHALL show the formula TDEE, the observed TDEE (or why it is unavailable), and the maintenance in use with its source; the target calories and macros preview SHALL be based on the maintenance in use.

#### Scenario: Observed differs from formula
- **WHEN** the formula TDEE is 2600 kcal and the observed TDEE is 2900 kcal at full confidence
- **THEN** the profile page SHALL show both values and that 2900 kcal (adaptive) drives the targets

### Requirement: History snapshots record maintenance
Profile history snapshots SHALL record the chosen maintenance (kcal, source, confidence, observed kcal) alongside the formula TDEE, and target calories/macros in the snapshot SHALL be computed from the chosen maintenance. Entries recorded without a maintenance field SHALL still render.

#### Scenario: Old entry
- **WHEN** a history entry's snapshot has no `maintenance` field
- **THEN** it SHALL render exactly as before
