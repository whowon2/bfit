# progress-chart-averages Specification

## Purpose
The progress chart shows the user's daily weigh-ins together with the EWMA trend weight on one time-scaled axis, filtered by the selected window. Period averages (weekly/monthly) are not charted; monthly averages live in the History list's month headers.
## Requirements
### Requirement: Chart always shows trend and daily series
The progress chart SHALL always render exactly two series: the daily series and the trend series. There SHALL be no series toggles. Weekly and monthly average series SHALL NOT be drawn.

#### Scenario: Chart with logged weights
- **WHEN** a user with logged weights opens the dashboard
- **THEN** the chart SHALL show the trend line and the daily points, with no Trend/Daily/Weekly/Monthly toggle buttons

### Requirement: Daily series is one point per logged day
The daily series SHALL have exactly one point per weight log entry (one per calendar day), with that day's value in the user's unit, drawn as dots joined by a thin, muted line so the trend reads as the primary line.

#### Scenario: Daily series matches logs
- **WHEN** a user has logged weight on 20 distinct days
- **THEN** the daily series has exactly 20 points, one per logged day, each with that day's value

### Requirement: Trend line on the progress chart
The trend series SHALL show the EWMA trend weight (as defined by the dashboard summary) at each logged day, drawn as the emphasized line without dots.

#### Scenario: Trend follows logged days
- **WHEN** the chart is rendered for a user with logged weights
- **THEN** the trend series SHALL have one value per logged day, equal to the dashboard's trend weight at that day

### Requirement: Time-scaled x-axis
Both series SHALL share one continuous time-based x-axis spanning the first to the last logged day in the selected window, so a gap in logging stretches that section of the chart instead of placing distant entries side by side.

#### Scenario: Gap in logging
- **WHEN** a user logged nothing for three weeks between two weigh-ins
- **THEN** the two points SHALL be three weeks apart on the x-axis

### Requirement: Window preset filters the chart
The selected time-window preset (1M/3M/6M/1Y/All) SHALL restrict both series to the same cutoff day used by the dashboard summary's window change. The selected preset SHALL be remembered per browser.

#### Scenario: Selecting a window preset
- **WHEN** a user selects the "3M" window preset
- **THEN** the chart SHALL show only daily and trend points from the last 3 months of logged data

### Requirement: Weight axis uses nice bounds
The weight y-axis domain SHALL be derived from the visible daily and trend values and rounded outward to "nice" tick steps (1, 2, 2.5 or 5 × 10ⁿ), with the ticks at those steps.

#### Scenario: Rounded domain
- **WHEN** visible weights range from 78.37 to 81.92
- **THEN** the axis SHALL span 78 to 82 with ticks every 0.5 or 1 unit, not raw data bounds

### Requirement: Progress chart shows weight only
The progress chart SHALL plot only weight (daily and trend). Calorie intake and body fat SHALL NOT be drawn on the progress chart, in a secondary panel or otherwise; they remain visible as numbers in the dashboard summary.

#### Scenario: Calorie and body fat data exist
- **WHEN** the user has calorie logs and body-fat readings in the selected window
- **THEN** the progress chart SHALL show no calorie bars, no body-fat line, and no toggles for them
