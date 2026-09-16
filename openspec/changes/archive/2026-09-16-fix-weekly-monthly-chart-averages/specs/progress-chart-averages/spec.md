## ADDED Requirements

### Requirement: Weekly average is one point per calendar week
The system SHALL compute the weekly series on the progress chart as one data point per calendar week (Monday-start) that contains at least one weight log entry, with the point's value equal to the average of that week's entries and the point's timestamp equal to the start of that week.

#### Scenario: Multiple logs in the same week collapse to one point
- **WHEN** a user has logged weight on Monday, Wednesday, and Friday of the same calendar week
- **THEN** the weekly series has exactly one point for that week, positioned at that week's start date, with value equal to the average of the three entries

#### Scenario: Logs in different weeks produce separate points
- **WHEN** a user has weight logs spread across four different calendar weeks (at least one log per week)
- **THEN** the weekly series has exactly four points, one per week, each positioned at its week's start date

### Requirement: Monthly average is one point per calendar month
The system SHALL compute the monthly series on the progress chart as one data point per calendar month that contains at least one weight log entry, with the point's value equal to the average of that month's entries and the point's timestamp equal to the start of that month.

#### Scenario: Multiple logs in the same month collapse to one point
- **WHEN** a user has logged weight ten times within the same calendar month
- **THEN** the monthly series has exactly one point for that month, positioned at that month's start date, with value equal to the average of all ten entries

#### Scenario: Logs in different months produce separate points
- **WHEN** a user has weight logs spread across six different calendar months (at least one log per month)
- **THEN** the monthly series has exactly six points, one per month, each positioned at its month's start date

### Requirement: Daily series remains one point per log entry
The system SHALL continue to render the daily series with exactly one point per weight log entry, unaffected by the weekly/monthly aggregation change.

#### Scenario: Daily series is unchanged
- **WHEN** a user has logged weight on 20 distinct days
- **THEN** the daily series has exactly 20 points, one per logged day, each with that day's raw value

### Requirement: All series share one time-scaled chart
The system SHALL render the daily, weekly, and monthly series on a single chart sharing one continuous time-based x-axis, such that each series' points are positioned at their true calendar date regardless of the other series' point density.

#### Scenario: Sparse monthly points align correctly against dense daily points
- **WHEN** the chart shows both the daily series (one point per log) and the monthly series (one point per month) for the same underlying data
- **THEN** each monthly point renders at its month-start x-position on the same axis used by the daily points, without being forced onto a daily point's timestamp

### Requirement: Window preset filters all series consistently
The system SHALL apply the selected time-window preset (1M/3M/6M/1Y/All) to the weekly and monthly series using the same cutoff date used for the daily series, so that toggling a preset restricts all visible series to the same date range.

#### Scenario: Selecting a window preset filters weekly and monthly points too
- **WHEN** a user selects the "3M" window preset
- **THEN** the weekly and monthly series only show points whose period falls within the last 3 months, consistent with the daily series' filtering
