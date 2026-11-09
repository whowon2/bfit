## ADDED Requirements

### Requirement: Trend weight is an exponentially weighted moving average
The system SHALL compute a trend weight per logged day as a time-aware EWMA of daily weights in kg, with smoothing factor α = 0.1 per day and an effective factor of `1 − (1 − α)^gapDays` across gaps, seeded with the first weight. The current trend weight is the trend value at the latest logged day, displayed in the user's unit.

#### Scenario: Single outlier day
- **WHEN** a user's weights are 80.0 kg for 14 consecutive days and then 82.0 kg on one day
- **THEN** the trend weight SHALL be 80.2 kg (moved by α × 2.0), not 82.0 kg

#### Scenario: Gap between weigh-ins
- **WHEN** two consecutive entries are 10 days apart
- **THEN** the later entry SHALL be weighted by `1 − 0.9^10` rather than 0.1

### Requirement: Weekly rate is a least-squares slope
The system SHALL compute the rate of change per week as the least-squares slope of daily weight (kg) against day over the last 28 days ending at the latest entry, multiplied by 7. It SHALL be unavailable with fewer than 2 entries or fewer than 7 days of span in that range.

#### Scenario: Steady loss
- **WHEN** a user's weights drop exactly 0.1 kg per day over the last 28 days
- **THEN** the rate SHALL be −0.7 kg/week (shown converted to the user's unit)

#### Scenario: Too little data
- **WHEN** a user has entries spanning only 3 days
- **THEN** the rate tile SHALL show that more data is needed

### Requirement: Window change follows the chart window
The summary SHALL show the change in trend weight between the first and the last logged day inside the chart's selected window (1M/3M/6M/1Y/All), and SHALL update when the window changes.

#### Scenario: Switching window
- **WHEN** the user switches the chart window from 1M to 3M
- **THEN** the change stat SHALL be recomputed over the 3M window and labeled with it

### Requirement: Body fat and projection
With a profile, the summary SHALL show the latest body fat against the profile's target body fat. When latest weight, latest body fat, target body fat and a weekly rate are known, and the rate moves weight toward the target weight (lean mass held constant), it SHALL show a projected date to reach the target; otherwise it SHALL say why no projection is shown.

#### Scenario: On track for a cut
- **WHEN** trend weight is 80 kg at 20% body fat, target is 15%, and the rate is −0.5 kg/week
- **THEN** the target weight SHALL be ≈ 75.3 kg and the projected date ≈ 9.4 weeks after the latest entry

#### Scenario: Moving away from target
- **WHEN** the target weight is below the trend weight and the rate is positive
- **THEN** no date SHALL be shown, and the tile SHALL say the trend is moving away from the target

### Requirement: Today status
The dashboard's today card (the quick log) SHALL show whether a weight is logged for today in the user's timezone, with that day's value when it is.

#### Scenario: Not yet logged
- **WHEN** the latest entry is yesterday in the user's timezone
- **THEN** the today indicator SHALL read "not logged yet"

### Requirement: Today's calories vs target
When a profile exists and a target is computable, the summary SHALL show today's logged calories (calorie log row for today in the user's timezone) against the target calories, or the target alone when nothing is logged today.

#### Scenario: Calories logged today
- **WHEN** today's calorie row has 1800 kcal and the target is 2200 kcal
- **THEN** the tile SHALL show 1800 of 2200 kcal

### Requirement: Reserved maintenance slot
The summary SHALL include a maintenance-calories tile whose data carries a `source` of `formula` or `adaptive`. This change SHALL fill it with the profile's formula TDEE (`source: "formula"`) and MUST NOT compute an adaptive estimate; a later change fills `adaptive`.

#### Scenario: Profile exists
- **WHEN** the user has a profile and a logged weight
- **THEN** the maintenance tile SHALL show the formula TDEE labeled as a formula estimate
