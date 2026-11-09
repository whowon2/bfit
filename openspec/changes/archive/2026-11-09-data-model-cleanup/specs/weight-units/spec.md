## MODIFIED Requirements

### Requirement: Export is self-describing
The JSON export SHALL be an object `{ format: "bfit-weights", version: 2, unit: "kg", weights: [...] }` with weight values in kg, where each weight has `date` (calendar day `YYYY-MM-DD`), `measuredAt` (ISO instant or `null`) and `bodyFatPercent`, so a re-import is unambiguous regardless of the importing user's unit or timezone. Version 1 exports (instant-only `date`) SHALL still import, with the day derived in the importing user's timezone.

#### Scenario: Round-trip export and import
- **WHEN** a user with unit `lbs` exports their weights and another user with unit `kg` imports that file
- **THEN** the imported kg values SHALL equal the exported kg values

#### Scenario: Round-trip keeps calendar days
- **WHEN** a user exports weights and a user in a different timezone imports the file
- **THEN** every imported row SHALL have the same `date` as in the export
