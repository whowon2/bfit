## MODIFIED Requirements

### Requirement: Reserved maintenance slot
The summary SHALL include a maintenance-calories tile showing the maintenance that drives targets, with a `source` of `adaptive`, `blended` or `formula`, a short subtitle naming the source (and confidence when not formula), and an info tooltip that explains how it was computed (window, logged days, weigh-ins, average intake, weekly rate) or why it fell back to the formula.

#### Scenario: Profile exists, enough data
- **WHEN** the user has a profile and a complete 28-day window of calories and weigh-ins
- **THEN** the maintenance tile SHALL show the observed estimate with source `adaptive`

#### Scenario: Profile exists
- **WHEN** the user has a profile and a logged weight but only a few days of calories
- **THEN** the maintenance tile SHALL show the formula TDEE labeled as a formula estimate and the tooltip SHALL say why the adaptive estimate is unavailable

### Requirement: Today's calories vs target
When a profile exists and a target is computable, the summary SHALL show today's logged calories (calorie log row for today in the user's timezone) against the target calories, or the target alone when nothing is logged today. The target SHALL be the chosen maintenance (adaptive, blended or formula) plus the goal-constrained daily change.

#### Scenario: Calories logged today
- **WHEN** today's calorie row has 1800 kcal and the target is 2200 kcal
- **THEN** the tile SHALL show 1800 of 2200 kcal

#### Scenario: Target follows adaptive maintenance
- **WHEN** the adaptive maintenance is 2900 kcal and the goal-constrained change is −500 kcal
- **THEN** the target SHALL be 2400 kcal
