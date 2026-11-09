## ADDED Requirements

### Requirement: Dashboard is not gated by the profile
The dashboard SHALL render for a signed-in user whether or not a profile exists. A user without a profile MUST be able to log weight and optional body fat, view the chart and history, and see weight-only summary stats.

#### Scenario: New user after signup
- **WHEN** a user who just signed up (no profile, no weights) opens `/dashboard`
- **THEN** the dashboard SHALL show the quick log form and an empty-state prompt to log a first weight, not the profile creation form

#### Scenario: Weights but no profile
- **WHEN** a user with logged weights and no profile opens `/dashboard`
- **THEN** the trend weight, weekly rate, window change and today status SHALL be shown, and the nutrition stats SHALL be replaced by a prompt linking to `/profile` that says a profile unlocks calorie and macro targets

### Requirement: Profile creation previews targets from logged data
The profile page SHALL show the creation form when no profile exists, and its calculation preview SHALL use the user's latest logged weight (kg) and latest body fat, so BMR, TDEE, target calories and macros are visible before saving.

#### Scenario: Preview with a logged weight
- **WHEN** a user with a logged weight and no profile opens `/profile`
- **THEN** the preview SHALL show BMR, TDEE, target calories and macros computed from that weight

#### Scenario: Preview without a logged weight
- **WHEN** a user with no logged weight opens `/profile`
- **THEN** the preview SHALL explain that logging a weight on the dashboard completes the targets

#### Scenario: Saving the defaults
- **WHEN** a user submits the creation form without changing any default value
- **THEN** the profile SHALL be saved (the button MUST NOT require the form to be edited first)
