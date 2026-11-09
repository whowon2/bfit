## Why

The Settings "Weight unit" select is cosmetic: `lib/auth.ts`'s `customSession` hardcodes `weightUnit: "kg"`, so a saved `lbs` preference never reaches the session (the select snaps back to kg), and even if it did, the unit is only a label — stored kg numbers would be shown with "lbs" next to them, and inputs typed in lbs would be stored as if they were kg. Imports ignore the source unit too (Lyfta exports carry `unit: "kg" | "lbs"`).

## What Changes

- Expose the real `user.weight_unit` on the session (Better Auth `user.additionalFields`, `input: false`) and drop the hardcoded `customSession` value.
- Saving the unit in Settings refreshes the session cookie cache so the new unit is reflected on the very next render (no 5-minute stale window).
- Weight values stay stored in kg (canonical). A single `lib/units.ts` module converts kg <-> lbs (1 lb = 0.45359237 kg) with defined rounding.
- Display edges convert kg to the user's unit: progress chart (daily/weekly/monthly series, trend footer), weight list entries and month averages/diffs, edit dialog prefill, profile "Based on ..." weight.
- Input edges convert from the user's unit to kg on the client before calling server actions; **server actions keep their kg-only contract** (unchanged signatures and validation).
- Import: Lyfta exports in lbs are converted to kg; BFit exports are self-describing; the legacy plain-array JSON format is still accepted and treated as kg.
- **BREAKING (file format)**: JSON export changes from a bare array to `{ format: "bfit-weights", version: 1, unit: "kg", weights: [...] }`. Re-import of both old and new files keeps working.
- Nutrition math (`lib/nutrition.ts`), protein g/kg, body fat %, and height (cm) remain unchanged.

## Capabilities

### New Capabilities
- `weight-units`: user-selectable display/input unit for body weight (kg/lbs), canonical kg storage, session exposure of the preference, conversion at UI and import/export edges.

### Modified Capabilities
<!-- none: server-action-auth requirements are unchanged (actions still take no userId and validate kg). -->

## Impact

- `lib/auth.ts` (additionalFields, remove customSession), `actions/settings.ts` (cookie cache refresh, revalidate profile).
- New `lib/units.ts`, new `lib/weight-import.ts`; `lib/lyfta.ts`.
- Components: `progress-chart.tsx`, `weight-list.tsx`, `add-weight.tsx`, `edit-weight.tsx`, `import-weights.tsx`, `export-json.tsx`.
- Pages: `app/dashboard/page.tsx`, `app/settings/page.tsx`, `app/profile/page.tsx`, `app/profile/update-form.tsx`.
- No DB schema change or migration (`user.weight_unit` already exists; all existing weight rows are kg).
