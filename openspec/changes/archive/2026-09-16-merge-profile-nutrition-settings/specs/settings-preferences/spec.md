## ADDED Requirements

### Requirement: Settings page scope
The `/settings` page SHALL contain only user preferences unrelated to fitness goal calculation: weight unit and theme. It SHALL NOT render profile or nutrition goal editing.

#### Scenario: Settings page shows only preferences
- **WHEN** a user with an existing profile navigates to `/settings`
- **THEN** the page shows a weight unit control and a theme toggle, and does not show profile fields (birth date, sex, height, activity level, goal, target body fat, timeframe, protein/carb ratios)

### Requirement: User can change weight unit
The system SHALL allow a signed-in user to switch their weight unit between kilograms and pounds from the settings page, and the change SHALL apply to weight displays across the app (e.g. dashboard).

#### Scenario: Switching weight unit updates displayed unit
- **WHEN** a user selects "lbs" as their weight unit on the settings page and the change is saved
- **THEN** subsequent views of the dashboard and other weight displays show weights labeled in pounds

#### Scenario: Weight unit persists across sessions
- **WHEN** a user has set their weight unit to a given value
- **THEN** the value persists and is reflected the next time they sign in

### Requirement: User can toggle theme
The system SHALL allow a signed-in user to switch between light and dark theme from the settings page, and the selection SHALL persist across page reloads.

#### Scenario: Toggling theme changes appearance immediately
- **WHEN** a user toggles the theme control on the settings page
- **THEN** the page's color scheme switches immediately without a full page reload

#### Scenario: Theme selection persists across reload
- **WHEN** a user has selected a theme (light or dark)
- **THEN** reloading the app retains that theme selection rather than resetting to system default
