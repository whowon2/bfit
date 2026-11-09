## MODIFIED Requirements

### Requirement: Goal determines the direction of the calorie change
The daily surplus/deficit SHALL be `0` for goal `maintain`, never positive for `cut`, and never negative for `bulk`, regardless of the target body fat. Target calories SHALL be the chosen maintenance (adaptive, blended or formula TDEE) plus this change, and macros SHALL be computed from those target calories.

#### Scenario: Maintain ignores target body fat
- **WHEN** a profile has goal `maintain`, current body fat 20% and target 15%
- **THEN** the computed surplus/deficit SHALL be 0 and target calories SHALL equal the chosen maintenance

#### Scenario: Cut with target above current
- **WHEN** a stored profile has goal `cut`, target body fat 25% and the latest body fat is 20%
- **THEN** the computed surplus/deficit SHALL be 0 (not a surplus) and the profile page SHALL warn about the conflict
