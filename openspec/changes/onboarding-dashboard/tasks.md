## 1. Pure helpers

- [ ] 1.1 Add `lib/trend.ts`: `dayDiff`, `ewmaTrend`, `weeklyRate`, `windowChange`, `projectToTarget`, `niceDomain`
- [ ] 1.2 Add `lib/nutrition-export.ts`: MFP-layout CSV writer for calorie rows

## 2. Actions

- [ ] 2.1 `importWeightEntries` returns `{ imported, updated, skipped }` (xmax counting, within-file duplicates skipped)
- [ ] 2.2 `importCalorieEntries` returns `{ imported, updated, skipped }`

## 3. Onboarding

- [ ] 3.1 Dashboard no longer renders `CreateProfileForm`; shows profile prompt in the summary instead
- [ ] 3.2 Profile page: parallel queries, pass latest weight + body fat to `CreateProfileForm`, intro copy; remove nutrition import card
- [ ] 3.3 `CreateProfileForm`: preview uses latest weight/body fat; save works without edits

## 4. Dashboard

- [ ] 4.1 Dashboard page: `Promise.all` queries; compute `today`, nutrition snapshot, today's calories server side
- [ ] 4.2 `components/quick-log.tsx` (replaces `add-weight.tsx`): prefilled, today default, another-day option, upsert toast
- [ ] 4.3 `components/summary-strip.tsx`: trend weight, weekly rate, window change, today status, body fat vs target, projection, calories vs target, reserved maintenance tile, profile prompt
- [ ] 4.4 `components/dashboard-view.tsx`: client layout owning chart window state; mobile-first grid
- [ ] 4.5 Progress chart: controlled window, EWMA trend series, nice y-axis, wrapped controls, short x ticks, prefs versioning, remove noisy footer
- [ ] 4.6 Weight list: remove `w-14` collapse, add/import/export controls removed, fixed-height scroll; empty state
- [ ] 4.7 Fix delete dialog copy

## 5. Settings → Data

- [ ] 5.1 `components/data-section.tsx` with weight import/export and nutrition import/export
- [ ] 5.2 Import buttons: typed parsing (no `any`), toasts with counts and specific errors
- [ ] 5.3 `components/export-nutrition.tsx`
- [ ] 5.4 Settings page loads weights + calories in parallel and renders the Data section

## 6. Polish & docs

- [ ] 6.1 Landing page light polish (server component)
- [ ] 6.2 Update CLAUDE.md (profile gating, data flow, trend helpers, Data section)
- [ ] 6.3 Verify: `bunx tsc --noEmit`, `bunx next build --turbopack`, `bunx biome check` on touched files
