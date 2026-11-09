## ADDED Requirements

### Requirement: X-axis spans only visible series
The shared time axis of the progress chart (weight and indicator panels) SHALL span only the dates of series that are currently visible (trend, daily, weekly, monthly per their toggles; calories and body fat per theirs) within the selected window. When no series is visible, the axis SHALL fall back to spanning all series in the window.

#### Scenario: Hidden monthly series does not stretch the axis
- **WHEN** the monthly series is hidden and the earliest daily log in the window is Sep 12 while the monthly point for September sits on Sep 1
- **THEN** the x-axis SHALL start at Sep 12, not Sep 1

#### Scenario: Nothing visible
- **WHEN** every series toggle is off
- **THEN** the x-axis SHALL span all series' dates in the window

### Requirement: Calorie axis uses nice ticks
The calorie panel's y-axis SHALL start at 0 and end at the visible calorie maximum rounded up to a nice step (1, 2, 2.5 or 5 × 10ⁿ), with ticks at those steps formatted with thousands separators.

#### Scenario: Rounded calorie ticks
- **WHEN** visible calorie days range up to 2661 kcal
- **THEN** the axis SHALL show ticks such as 0, 1,000, 2,000, 3,000 rather than raw values like 2661 or 900
