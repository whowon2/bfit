## ADDED Requirements

### Requirement: Data section in Settings
Settings SHALL have a Data section containing weight import (JSON: BFit or Lyfta), weight export (BFit JSON), nutrition import (MyFitnessPal Nutrition Summary CSV) and nutrition export. The dashboard and profile pages SHALL NOT show import/export controls.

#### Scenario: Finding import
- **WHEN** a user opens `/settings`
- **THEN** the Data section SHALL show import and export actions for weights and nutrition

### Requirement: Import reports counts
Weight and nutrition imports SHALL return how many days were newly imported, how many existing days were updated, and how many rows were skipped (rows without a usable date or value, and duplicate days within the file). The UI SHALL show these counts in a success toast.

#### Scenario: Re-import of an overlapping file
- **WHEN** a user imports a file with 10 days, 4 of which already exist and 1 row lacks a date
- **THEN** the toast SHALL report 5 imported, 4 updated, 1 skipped

### Requirement: Import errors are specific
An import SHALL show an error toast naming the problem: unreadable JSON, unrecognized file format, no usable rows, or rows rejected by the server.

#### Scenario: Wrong file type
- **WHEN** a user selects a JSON file that is neither a BFit nor a Lyfta export
- **THEN** an error toast SHALL say the format is not recognized and list the supported formats

### Requirement: Nutrition export re-imports
Nutrition export SHALL download a CSV in the MyFitnessPal Nutrition Summary layout (`Date,Meal,Calories,Fat (g),Carbohydrates (g),Protein (g)`, one "Daily total" row per day), so importing it restores the same per-day totals.

#### Scenario: Round trip
- **WHEN** a user exports nutrition and imports the file
- **THEN** every day SHALL be reported as updated with unchanged values
