## Context

`/profile`, `/nutrition`, `/settings` all read the same `userProfile` row and duplicate BMR/TDEE/macro calc calls (`lib/nutrition.ts`). `/settings` currently just renders `UpdateProfileForm` — no actual preferences live there. There's no history of profile edits, and no live preview before saving a goal change. `next-themes` is installed (used by `components/ui/sonner.tsx`'s `useTheme`) but no `ThemeProvider` wraps the app, so theme is effectively non-functional today.

## Goals / Non-Goals

**Goals:**
- One page (`/profile`) for profile data, computed stats, and macro targets, editable in place.
- Before saving a change to any calc-affecting field, show the delta in BMR/TDEE/target calories/macros.
- Persist a history of profile changes (field, old value, new value, resulting calc deltas) and render it.
- Inline info affordance per field replacing static helper copy, for fields whose effect on the math isn't obvious (activity level, protein/kg, carb split, target body fat/weeks).
- `/settings` becomes real settings: weight unit + theme toggle.

**Non-Goals:**
- No redesign of the underlying BMR/TDEE/macro formulas (`lib/nutrition.ts` unchanged).
- No multi-profile / profile versioning beyond a flat append-only history log.
- No undo/rollback UI for history entries (view-only log).
- No changes to weight-entry CRUD, calorie logging, or auth flows beyond the weight-unit control.

## Decisions

**Single merged page, tabs/sections not separate routes.** `/profile` becomes one Server Component page with an "Overview" section (current stats, same as today's Profile page) and a "Goals & Macros" section (editable form + macro targets, same as today's Nutrition page), plus a "History" section below. Rationale: avoids client-side route state just to preserve a two-tab feel; keeps SSR simplicity per CLAUDE.md architecture (Server Component fetches, passes to client form). Alternative considered: keep `/nutrition` as a sub-view — rejected, adds a route for content that's now always shown together.

**History persisted as new `profileHistory` table**, one row per save, storing: `userId`, `changedFields` (jsonb: `{field: {old, new}}`), `calcSnapshot` (jsonb: `{bmr, tdee, targetCalories, macros}` before and after), `createdAt`. Rationale: history must survive across sessions/devices and be queryable; sessionStorage/localStorage would not satisfy "show on the history what he changed." Alternative considered: reuse `calorieLog` — rejected, that table tracks daily calorie logging, not profile edits, and mixing concerns would break its existing per-day semantics.

**Preview computed client-side, not via server round-trip.** `UpdateProfileForm` already has all inputs needed (`lib/nutrition.ts`'s `calcBmr`/`calcTdee`/`calcDailyCalorieChange`/`calcMacros` are pure functions with no DB access) — watch form values with `form.watch()`, recompute on every change, diff against the server-rendered current values, render inline (e.g. "TDEE: 2400 → 2550 kcal"). Rationale: instant feedback, no extra network/db round trip. Alternative considered: server action preview endpoint — rejected as unnecessary latency for a pure-function calculation.

**History written inside `updateProfile`/`createProfile` server actions**, not a separate action. Before applying the update, action computes old calc snapshot (needs latest weight/body fat, already available via existing `getLatestWeight`/`getLatestBodyFat`), applies the update, computes new snapshot, diffs `data` against the current profile row for `changedFields`, inserts one `profileHistory` row. `createProfile`'s first save also writes one row (old = all null/absent) so history always has a baseline entry.

**Info tooltips reuse existing `Tooltip`/`Info` icon pattern** already used in `app/profile/page.tsx` (lines 171-180) — extend that pattern into the form fields via a small shared `FieldInfo` wrapper component instead of duplicating the Tooltip/TooltipTrigger/TooltipContent block per field.

**Weight unit control**: new `updateWeightUnit(userId, unit)` server action (`actions/settings.ts`), writes `user.weightUnit`, calls `revalidatePath("/settings")` and `revalidatePath("/dashboard")`. Better Auth's `customSession` plugin reads `weightUnit` per-request from the DB (see `lib/auth.ts`), so no explicit session-cache invalidation is required beyond Next's `revalidatePath`.

**Theme toggle**: add `ThemeProvider` (`next-themes`) to `app/layout.tsx` wrapping the body (`attribute="class"`, `defaultTheme="system"`, `enableSystem`), add a simple toggle component (`components/theme-toggle.tsx`) using `useTheme()` for `/settings`. This is additive infra fixing the already-half-installed dependency, not a new library choice.

**Route removal**: delete `app/nutrition/page.tsx`. Update `components/sidebar.tsx` nav links (remove Nutrition entry, ensure Profile/Settings links point correctly).

## Risks / Trade-offs

- **[Risk]** `profileHistory` rows growing unbounded for active users → **Mitigation**: not addressed in this change (no pagination/retention needed at current scale); page renders most-recent N (e.g. 10) with a "show more" if needed later.
- **[Risk]** Diffing `data` against current profile row in `updateProfile` requires fetching the pre-update row first (extra query) → **Mitigation**: acceptable, profile updates are low-frequency, not on a hot path.
- **[Risk]** `createProfile`/`updateProfile` currently type `data: any` (`actions/weight.ts`) — writing structured `changedFields` diffs against untyped input is error-prone → **Mitigation**: type `data` against the existing Zod `formSchema` shape (already defined in the form files) when threading it through the action.
- **[Risk]** Merged page becomes long/dense on mobile (`max-w-md` layout) → **Mitigation**: collapse History section by default (e.g. `<details>` or accordion), keep Overview + Goals above the fold.
- **[Risk]** Breaking `/nutrition` and `/settings` bookmarks/links → **Mitigation**: acceptable per proposal (marked BREAKING); this is a low-traffic personal-scale app per CLAUDE.md.

## Migration Plan

1. `db/schema.ts`: add `profileHistory` table; run `bunx drizzle-kit generate` + review migration; apply manually via `bunx drizzle-kit migrate`.
2. Add `ThemeProvider` to `app/layout.tsx`; add `components/theme-toggle.tsx`.
3. Extend `actions/weight.ts` (`createProfile`/`updateProfile`) to write history rows; add `actions/settings.ts` for `updateWeightUnit`.
4. Add `FieldInfo` helper component; wire into `update-form.tsx`/`create-form.tsx` fields, replacing `FormDescription` copy where an info bubble is more appropriate.
5. Add live-preview diff rendering to `UpdateProfileForm` (create-form has no "before" state to diff against, so preview there is less critical — still show computed live values).
6. Rewrite `app/profile/page.tsx` to include Overview + Goals/Macros (merging `app/nutrition/page.tsx` logic) + History section.
7. Rewrite `app/settings/page.tsx` with weight-unit + theme controls.
8. Delete `app/nutrition/page.tsx`; update `components/sidebar.tsx` links.
9. Manual smoke test: create profile, edit goal, verify preview numbers match post-save numbers, verify history row appears, verify weight unit change reflects on `/dashboard`, verify theme toggle persists across reload.

Rollback: revert commits; the new `profileHistory` table is additive (no destructive migration on existing tables), so rollback needs no down-migration beyond dropping the new table if desired.

## Open Questions

- Should `profileHistory` also capture edits made via `CreateProfileForm`'s initial creation as a "Created profile" entry, or only subsequent edits? (Design above assumes yes, for a complete log — confirm during implementation if this feels noisy.)
- Exact cap/pagination for the history list (proposal says "history of changes" without a limit) — defaulting to most-recent 10, expandable.
