## ADDED Requirements

### Requirement: Trend line on the progress chart
The progress chart SHALL offer a "Trend" series showing the EWMA trend weight (as defined by the dashboard summary) at each logged day, toggleable like the other series and visible by default.

#### Scenario: Trend shown by default
- **WHEN** a user opens the dashboard for the first time with logged weights
- **THEN** the chart SHALL show the trend line together with the daily series

### Requirement: Weight axis uses nice bounds
The weight y-axis domain SHALL be derived from the visible weight series and rounded outward to "nice" tick steps (1, 2, 2.5 or 5 × 10ⁿ), with the ticks at those steps.

#### Scenario: Rounded domain
- **WHEN** visible weights range from 78.37 to 81.92
- **THEN** the axis SHALL span 78 to 82 with ticks every 0.5 or 1 unit, not raw data bounds
