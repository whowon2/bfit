## ADDED Requirements

### Requirement: Goal determines the direction of the calorie change
The daily surplus/deficit SHALL be `0` for goal `maintain`, never positive for `cut`, and never negative for `bulk`, regardless of the target body fat.

#### Scenario: Maintain ignores target body fat
- **WHEN** a profile has goal `maintain`, current body fat 20% and target 15%
- **THEN** the computed surplus/deficit SHALL be 0 and target calories SHALL equal TDEE

#### Scenario: Cut with target above current
- **WHEN** a stored profile has goal `cut`, target body fat 25% and the latest body fat is 20%
- **THEN** the computed surplus/deficit SHALL be 0 (not a surplus) and the profile page SHALL warn about the conflict

### Requirement: Goal and target body fat are validated together
When the latest body-fat measurement is known, the profile forms and `createProfile`/`updateProfile` SHALL reject a target body fat at or above current body fat for `cut`, or at or below current body fat for `bulk`, with a message on the target body fat field.

#### Scenario: Bulk with lower target
- **WHEN** a user with 15% current body fat submits goal `bulk` and target body fat 12%
- **THEN** the form SHALL show an error on target body fat and the profile SHALL NOT be saved

#### Scenario: No body fat logged
- **WHEN** the user has never logged body fat
- **THEN** any combination of goal and target body fat SHALL be accepted

### Requirement: Unused calorie inputs are removed
The profile SHALL NOT store maintenance calories or current calories; maintenance is computed. Profile history entries recorded before the removal SHALL still render, including changes to the removed fields.

#### Scenario: Old history entry
- **WHEN** a profile history entry's `changedFields` contains `maintenanceCalories`
- **THEN** the history panel SHALL render it with the label "Maintenance calories"
