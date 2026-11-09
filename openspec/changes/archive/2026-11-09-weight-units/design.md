## Context

`user.weight_unit` (text, default `kg`) exists in the DB and `updateWeightUnit` writes it, but `lib/auth.ts` overrides the session value with a hardcoded `"kg"` via `customSession`. Better Auth's Drizzle adapter only selects fields it knows about, so the column never reaches the session anyway. The session cookie cache (`maxAge: 5 min`) would additionally serve a stale user object after a change. All existing weight rows were entered as kg (the setting never worked), so they are already canonical. Server actions follow the `requireUserId()` / zod pattern from `server-action-auth`.

## Goals / Non-Goals

**Goals:**
- Real, immediately effective unit preference on the session.
- Canonical kg storage; conversion only at display and input edges, through one helper module.
- Import/export that is unambiguous about units.

**Non-Goals:**
- No data migration, no schema change.
- No UI redesign; no unit choice for height (cm), body fat (%), or protein (g/kg).
- No per-entry unit storage.

## Decisions

### 1. Session: `user.additionalFields.weightUnit` with `input: false`
Declare `weightUnit: { type: "string", defaultValue: "kg", input: false }` in `betterAuth({ user: { additionalFields } })` and remove the `customSession` plugin (its only purpose was the hardcoded field). This makes the adapter select the column, types `session.user.weightUnit`, and prevents sign-up/update-user from setting it. A small `toWeightUnit(value: unknown): WeightUnit` normalizer in `lib/units.ts` maps anything other than `"lbs"` to `"kg"`.
*Alternative*: keep `customSession` and query the DB in it — costs a DB hit on every `getSession`, defeating the cookie cache.

### 2. Cookie cache refresh after saving
After the DB update, `updateWeightUnit` calls `auth.api.getSession({ headers, query: { disableCookieCache: true } })`. That path reads the session+user from the DB and re-writes the `session_data` cookie (`setCookieCache`); the `nextCookies()` plugin forwards the `Set-Cookie` from the server action. Followed by `revalidatePath` for `/settings`, `/dashboard`, `/profile` and the client's `router.refresh()`.
*Alternative*: shorten / disable `cookieCache` — affects every request for a rare event.

### 3. Server actions stay kg-only; clients convert
Weight actions keep their existing signatures and zod limits (kg, `0 < v < 1000`). Client components convert user-unit input to kg with `lib/units.ts` before calling actions, and convert kg to display values for rendering. The unit is passed from the Server Component page (`session.user.weightUnit`) down as a prop, like today.
*Alternative*: actions read the unit from the session and convert server-side. Rejected: the meaning of a number would depend on mutable server state — a stale tab opened before a unit switch would silently mis-convert. An explicit kg contract is simpler to validate and keeps imports (which have their own source unit) on the same path.

### 4. `lib/units.ts` and rounding
- `LB_IN_KG = 0.45359237`, `type WeightUnit = "kg" | "lbs"`.
- `kgToUnit(kg, unit)` / `unitToKg(value, unit)` — raw conversions.
- `toStoredKg(value, unit)` — `unitToKg` rounded to 2 decimals (matches `decimal(5,2)`).
- `displayWeight(kg, unit)` — numeric, rounded to 2 decimals for kg, 1 decimal for lbs (lbs from 2-decimal kg cannot be more precise than ~0.02 lb anyway).
- Chart series and month averages are computed from display values; averages/deltas are then rounded with the same per-unit precision.

### 5. Edit dialog preserves untouched values
The edit dialog prefills `displayWeight(kg, unit)`. On save, if the weight input string equals the prefilled string, the original stored kg is sent unchanged; otherwise the edited value is converted with `toStoredKg`. This avoids lbs round-trip drift (e.g. 81.65 → 180.0 → 81.65 is stable, but not every value is).

### 6. Import/export format
- Export: `{ format: "bfit-weights", version: 1, unit: "kg", weights: [{ value, bodyFatPercent, date }] }` (values in kg as stored).
- New `lib/weight-import.ts` `parseWeightImport(data)` returns `{ value: number (kg), date, bodyFatPercent }[]`:
  - Lyfta (`isLyftaWeightExport`) → `convertLyftaWeights` now converts with `toStoredKg(measure, lyfta.unit ?? "kg")`.
  - BFit object (`format === "bfit-weights"`) → convert by its `unit` (kg in practice; lbs accepted for hand-edited files).
  - Plain array → kg as-is (legacy).
  - Anything else → throws, surfaced as the existing "Import failed" error.
- The import action still re-validates rows server-side.

### 7. Profile
`app/profile/page.tsx` passes `weightUnit` to `UpdateProfileForm`; the form keeps `weightKg` for `computeCalcSnapshot` and only formats the "Based on" label via `displayWeight`. `lib/nutrition.ts` is untouched.

## Risks / Trade-offs

- [Rounding: lbs input stored at 0.01 kg precision] → at most ±0.011 lb error, below display precision.
- [Export format change breaks external consumers expecting an array] → the app itself accepts both; documented as a file-format change in the proposal.
- [Lyfta file missing `unit`] → treated as kg (prior behavior).
- [Removing `customSession` changes session inference on the client `Session` type] → client type is not consumed for `weightUnit`; server types come from `additionalFields`.

## Migration Plan

No DB migration. Deploy is a code-only change; existing rows are already kg. Rollback = revert the commit (users who chose lbs would see kg values labelled kg again, which is correct data).

## Open Questions

- Should protein target be shown as g/lb for lbs users? Out of scope here; kept g/kg.
