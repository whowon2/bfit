## ADDED Requirements

### Requirement: Profile change preview before save
While editing profile or goal fields on the merged profile page, the system SHALL compute and display the resulting BMR, TDEE, target calories, and macro targets using the in-progress (unsaved) form values, alongside the currently-saved values, before the user submits.

#### Scenario: Editing activity level shows updated TDEE before saving
- **WHEN** a user with an existing profile changes the Activity Level field from "Sedentary" to "Moderately active" without submitting
- **THEN** the page displays the current TDEE and a preview TDEE reflecting the new activity multiplier, so the user can compare both before saving

#### Scenario: Editing target body fat or timeframe shows updated calorie target
- **WHEN** a user changes Target Body Fat % or Timeframe (weeks)
- **THEN** the page displays the current daily calorie surplus/deficit and target calories alongside the preview values computed from the new inputs

#### Scenario: No changes yields no diff
- **WHEN** the form values are unchanged from the saved profile
- **THEN** the page does not display a preview diff (current and preview values are identical, so no comparison is shown)

### Requirement: Profile change history is recorded
Each time a user's profile is created or updated, the system SHALL persist a history record containing which fields changed, their old and new values, and the resulting calculation snapshot (BMR, TDEE, target calories, macros) before and after the change.

#### Scenario: Saving a profile edit creates a history entry
- **WHEN** a user submits an update to one or more profile fields
- **THEN** a new history record is stored with the changed field names, their previous and new values, and the calculation values before and after the change

#### Scenario: Initial profile creation creates a baseline history entry
- **WHEN** a user creates their profile for the first time
- **THEN** a history record is stored representing the initial values and initial calculation snapshot

#### Scenario: Submitting with no field changes does not create a history entry
- **WHEN** a user submits the profile form without modifying any field
- **THEN** no new history record is created

### Requirement: Profile change history is displayed
The merged profile page SHALL display a history section listing past profile changes, showing what changed and the resulting calculation impact, ordered most recent first.

#### Scenario: History section lists recent changes
- **WHEN** a user with prior profile edits views the profile page
- **THEN** the history section lists each past change with the changed fields, old → new values, and the calculation deltas caused by that change, most recent first

#### Scenario: No history yet
- **WHEN** a user has only ever created their profile once with no subsequent edits
- **THEN** the history section shows at least the initial creation entry
