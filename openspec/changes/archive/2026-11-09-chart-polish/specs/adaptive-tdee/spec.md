## ADDED Requirements

### Requirement: Confidence is presented as data coverage
Wherever the observed-TDEE confidence score is shown to the user (dashboard summary strip, profile page, maintenance explanation, profile form note), it SHALL be labelled as data coverage (e.g. "95% data coverage"), not as "confidence", since it measures window length, logging coverage and weigh-in count rather than statistical uncertainty. The numeric value SHALL remain visible.

#### Scenario: Summary strip label
- **WHEN** maintenance is adaptive with a score of 0.95
- **THEN** the summary strip SHALL read "Adaptive · 95% data coverage" (or equivalent source label) and SHALL NOT use the word "confidence"

#### Scenario: Blended explanation
- **WHEN** maintenance is blended with a score of 0.6
- **THEN** the explanation SHALL state the 60% data coverage and that observed and formula TDEE are blended by coverage
