## 1. Schema & data layer

- [x] 1.1 Add `profileHistory` table to `db/schema.ts` (`userId` FK cascade delete, `changedFields` jsonb, `calcSnapshot` jsonb, `createdAt`), export `ProfileHistory` type
- [x] 1.2 Run `bunx drizzle-kit generate`, review generated migration
- [x] 1.3 Apply migration with `bunx drizzle-kit migrate` against local `DATABASE_URL`

## 2. Server actions

- [x] 2.1 Type `createProfile`/`updateProfile` input against the existing Zod `formSchema` shape instead of `data: any` (`actions/weight.ts`)
- [x] 2.2 Add `getProfileHistory(userId, limit = 10)` query, most recent first
- [x] 2.3 Extend `updateProfile`: fetch current profile + latest weight/body fat before update, compute old calc snapshot (`calcBmr`/`calcTdee`/`calcDailyCalorieChange`/`calcMacros`), apply update, compute new snapshot, diff changed fields, insert `profileHistory` row (skip insert if no fields changed)
- [x] 2.4 Extend `createProfile` to insert a baseline `profileHistory` row (old = null/absent, new = initial values, snapshot before = null)
- [x] 2.5 Add `actions/settings.ts` with `updateWeightUnit(userId, unit: "kg" | "lbs")`, `revalidatePath("/settings")` + `revalidatePath("/dashboard")`

## 3. Shared UI: field info affordance

- [x] 3.1 Add `components/field-info.tsx`: small wrapper rendering a label plus an info icon + `Tooltip` (reuse pattern from `app/profile/page.tsx`)
- [x] 3.2 Replace `FormDescription` copy with `FieldInfo` for: Activity Level (explain each level + its TDEE multiplier), Protein target (g/kg meaning + range), Carb/Fat split (how remaining calories are split), Target Body Fat/Timeframe (how they drive daily deficit/surplus) in `app/profile/update-form.tsx` and `app/profile/create-form.tsx`

## 4. Live preview

- [x] 4.1 In `UpdateProfileForm`, use `form.watch()` to recompute BMR/TDEE/target calories/macros from in-progress values on every change
- [x] 4.2 Render a preview block (current → new) for BMR, TDEE, daily deficit/surplus, and macros; hide the diff when preview equals current values
- [x] 4.3 Add equivalent live-computed (non-diffed) preview values to `CreateProfileForm` since there's no prior saved state to diff against

## 5. Merged profile page

- [x] 5.1 Rewrite `app/profile/page.tsx`: keep existing Overview stats section, add a Goals & Macros section (port calc + macros rendering from `app/nutrition/page.tsx`), render `UpdateProfileForm` for editing
- [x] 5.2 Add a History section to `app/profile/page.tsx` using `getProfileHistory`, showing changed fields (old → new) and calc deltas per entry, most recent first, collapsed by default on mobile
- [x] 5.3 Delete `app/nutrition/page.tsx`

## 6. Settings page

- [x] 6.1 Rewrite `app/settings/page.tsx`: remove `UpdateProfileForm`/`CreateProfileForm` usage, keep the profile-gate redirect to profile creation only where required
- [x] 6.2 Add weight-unit control (select/toggle) wired to `updateWeightUnit`
- [x] 6.3 Add `components/theme-toggle.tsx` using `next-themes`' `useTheme()`; add to settings page

## 7. Theme infra

- [x] 7.1 Wrap `app/layout.tsx` body in `next-themes`' `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`)
- [x] 7.2 Verify `components/ui/sonner.tsx`'s existing `useTheme()` call now reflects the toggled theme

## 8. Navigation

- [x] 8.1 Update `components/sidebar.tsx`: remove any `/nutrition` link, verify `/profile` and `/settings` links/labels still make sense given the new page scopes

## 9. Verification

- [x] 9.1 `bun run lint` (clean on all files touched by this change; pre-existing unrelated lint errors left untouched)
- [ ] 9.2 Manual: create profile → history baseline entry appears
- [ ] 9.3 Manual: edit activity level/goal on `/profile`, confirm preview numbers shown before save match post-save numbers, confirm new history entry with correct old/new + calc deltas
- [ ] 9.4 Manual: change weight unit on `/settings`, confirm `/dashboard` reflects new unit
- [ ] 9.5 Manual: toggle theme on `/settings`, confirm immediate switch and persistence across reload
- [ ] 9.6 Manual: confirm `/nutrition` route is gone and no dangling links remain
