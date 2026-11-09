## 1. Foundation

- [ ] 1.1 Add `server-only` dependency (`bun add server-only`)
- [ ] 1.2 Create `lib/session.ts` exporting `requireUserId()` that throws when there is no session

## 2. Server-only queries

- [ ] 2.1 Create `lib/queries/weight.ts` (`getWeightEntries`, `getLatestWeight`, `getLatestBodyFat`)
- [ ] 2.2 Create `lib/queries/profile.ts` (`getProfile`, `getProfileHistory`)
- [ ] 2.3 Create `lib/queries/calorie.ts` (`getCalorieEntries`)
- [ ] 2.4 Point `app/dashboard/page.tsx` and `app/profile/page.tsx` at the query modules

## 3. Harden server actions

- [ ] 3.1 Split profile actions into `actions/profile.ts`; `createProfile`/`updateProfile` take only validated form data and use the session user
- [ ] 3.2 Rewrite `actions/weight.ts`: session-derived user, zod validation, `id AND userId` scoping on update/delete, import rows stamped with session user, `revalidatePath` instead of `revalidateTag`
- [ ] 3.3 Delete dead code: `deleteWeightEntry`, `getTodayWeight`, `getWeeklyAverages`
- [ ] 3.4 Rewrite `actions/calorie.ts` `importCalorieEntries` with zod row validation and session user
- [ ] 3.5 Rewrite `actions/settings.ts` `updateWeightUnit(unit)` with session user and enum validation

## 4. Call sites

- [ ] 4.1 Update `add-weight`, `edit-weight`, `remove-weight`, `weight-list` to drop `userId`
- [ ] 4.2 Update `import-weights`, `import-nutrition`, and `lib/lyfta.ts` to stop sending `userId`
- [ ] 4.3 Update `weight-unit-select` and `app/settings/page.tsx`
- [ ] 4.4 Update profile create/update forms to new action signatures and import path

## 5. Proxy and docs

- [ ] 5.1 Extend `proxy.ts` matcher to `/profile` and `/settings`
- [ ] 5.2 Update CLAUDE.md architecture notes (queries vs actions, session-derived userId)

## 6. Verify

- [ ] 6.1 `bun run lint`, `bunx tsc --noEmit`, `bun run build` pass
- [ ] 6.2 Grep confirms no `"use server"` file exports a read helper and no action takes `userId`
