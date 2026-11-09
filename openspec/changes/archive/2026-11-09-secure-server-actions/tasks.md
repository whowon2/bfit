## 1. Foundation

- [x] 1.1 Add `server-only` dependency (`bun add server-only`)
- [x] 1.2 Create `lib/session.ts` exporting `requireUserId()` that throws when there is no session

## 2. Server-only queries

- [x] 2.1 Create `lib/queries/weight.ts` (`getWeightEntries`, `getLatestWeight`, `getLatestBodyFat`)
- [x] 2.2 Create `lib/queries/profile.ts` (`getProfile`, `getProfileHistory`)
- [x] 2.3 Create `lib/queries/calorie.ts` (`getCalorieEntries`)
- [x] 2.4 Point `app/dashboard/page.tsx` and `app/profile/page.tsx` at the query modules

## 3. Harden server actions

- [x] 3.1 Split profile actions into `actions/profile.ts`; `createProfile`/`updateProfile` take only validated form data and use the session user
- [x] 3.2 Rewrite `actions/weight.ts`: session-derived user, zod validation, `id AND userId` scoping on update/delete, import rows stamped with session user, `revalidatePath` instead of `revalidateTag`
- [x] 3.3 Delete dead code: `deleteWeightEntry`, `getTodayWeight`, `getWeeklyAverages`
- [x] 3.4 Rewrite `actions/calorie.ts` `importCalorieEntries` with zod row validation and session user
- [x] 3.5 Rewrite `actions/settings.ts` `updateWeightUnit(unit)` with session user and enum validation

## 4. Call sites

- [x] 4.1 Update `add-weight`, `edit-weight`, `remove-weight`, `weight-list` to drop `userId`
- [x] 4.2 Update `import-weights`, `import-nutrition`, and `lib/lyfta.ts` to stop sending `userId`
- [x] 4.3 Update `weight-unit-select` and `app/settings/page.tsx`
- [x] 4.4 Update profile create/update forms to new action signatures and import path

## 5. Proxy and docs

- [x] 5.1 Extend `proxy.ts` matcher to `/profile` and `/settings`
- [x] 5.2 Update CLAUDE.md architecture notes (queries vs actions, session-derived userId)

## 6. Verify

- [x] 6.1 `bun run lint`, `bunx tsc --noEmit`, `bun run build` pass
- [x] 6.2 Grep confirms no `"use server"` file exports a read helper and no action takes `userId`
