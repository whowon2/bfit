## Why

`/settings` today just re-renders the profile edit form — it isn't settings, it's "edit profile." Profile data, nutrition targets, and the numbers they drive are split across three routes (`/profile`, `/nutrition`, `/settings`) with no way to see how a goal edit will change calorie/macro targets before committing, and no record of what was changed or why numbers moved. Activity level and similar fields also rely on text below the field instead of inline help.

## What Changes

- Merge `/profile` and `/nutrition` into a single page (`/profile`) that shows profile data, computed stats (BMR/TDEE/deficit-surplus), and macro targets together, with inline editing.
- **BREAKING**: `/settings` no longer renders the profile edit form. It becomes a real settings page with weight unit (kg/lbs) and theme toggle only.
- Add a live preview: while editing profile/goal fields, show the resulting BMR/TDEE/calorie target/macro deltas before the user saves.
- Add a profile change history: each save records what fields changed, old → new values, and the resulting calculation deltas (e.g., TDEE, target calories, macros before/after). Shown as a log on the merged page.
- Replace descriptive helper text under fields (activity level, protein/kg, carb split) with an info ("?") affordance next to the field label that explains the field and, where relevant, how it factors into the BMR/TDEE/macro math.
- Add a weight-unit update control and a light/dark theme toggle to `/settings` (neither currently has a UI control — weight unit is set at signup only, theme has no toggle wired despite `next-themes` being installed).
- `/nutrition` route is removed; nutrition content lives on the merged profile page.

## Capabilities

### New Capabilities
- `profile-history`: Recording and displaying a history of profile/goal changes and their calculated impact.
- `settings-preferences`: User-controlled weight unit and theme preference, editable from `/settings`.

### Modified Capabilities
- (none — no existing `openspec/specs/` capability covers profile/nutrition page behavior; this is new spec surface, not a change to specced behavior)

## Impact

- Routes: `app/profile/page.tsx` (rewritten), `app/nutrition/page.tsx` (removed), `app/settings/page.tsx` (rewritten).
- Components: `app/profile/update-form.tsx` and `create-form.tsx` (extended with preview + info tooltips), new components for change history list and settings controls.
- Data: new `profileHistory` table in `db/schema.ts` (FK to `user`, cascade delete) + migration via `drizzle-kit generate`; `actions/weight.ts` `updateProfile`/`createProfile` extended to write history rows; new `actions/settings.ts` (or extend `actions/weight.ts`) for weight-unit updates.
- Auth/session: no schema change to `user.weightUnit` (already exists) — needs a server action + form wired to it, and session/customSession refresh after change.
- Theme: needs `ThemeProvider` (`next-themes`) wired into `app/layout.tsx`, currently absent.
- Nav/links: any links to `/nutrition` or `/settings` (sidebar) need updating.
