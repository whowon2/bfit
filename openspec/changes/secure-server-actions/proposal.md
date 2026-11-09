## Why

Every function exported from a `"use server"` file in `actions/*.ts` is a publicly callable POST endpoint, yet none of them check the session. Mutations trust a client-supplied `userId`, `removeWeightEntry` deletes any row by id (IDOR), and read helpers living in those files let anyone read any user's weights, profile, history and nutrition data.

## What Changes

- Add `lib/session.ts` with `requireUserId()`, which resolves the user from `auth.api.getSession({ headers: await headers() })` and throws when unauthenticated.
- **BREAKING (internal API)**: remove `userId` parameters from `addWeightEntry`, `updateWeightEntry`, `createProfile`, `updateProfile`, `updateWeightUnit`; import actions (`importWeightEntries`, `importCalorieEntries`) ignore any client-supplied `userId` and stamp the session user.
- Every update/delete filters by both row id AND session user id (fixes `removeWeightEntry` IDOR).
- Move read/query helpers (`getWeightEntries`, `getLatestWeight`, `getLatestBodyFat`, `getProfile`, `getProfileHistory`, `getCalorieEntries`) out of `"use server"` files into `lib/queries/*.ts` guarded by `import "server-only"`; Server Components import from there.
- Validate action inputs server side with zod (finite numbers, sane ranges, import row shapes, row-count cap).
- Remove dead code: `deleteWeightEntry`, `getTodayWeight`, `getWeeklyAverages`, and no-op `revalidateTag("weights")` calls (replaced by `revalidatePath`).
- Extend `proxy.ts` matcher to `/profile` and `/settings` (still optimistic only).
- Update CLAUDE.md architecture notes.

## Capabilities

### New Capabilities
- `server-action-auth`: Server actions derive the acting user from the session, enforce ownership on every mutation, validate input, and data reads are not exposed as server actions.

### Modified Capabilities

## Impact

- Code: `actions/weight.ts`, `actions/calorie.ts`, `actions/settings.ts`, new `lib/session.ts`, new `lib/queries/{weight,profile,calorie}.ts`, `lib/lyfta.ts`, `proxy.ts`, pages under `app/dashboard`, `app/profile`, `app/settings`, and client components `add-weight`, `edit-weight`, `remove-weight`, `import-weights`, `import-nutrition`, `weight-unit-select`, `weight-list`, profile create/update forms.
- Dependencies: adds `server-only`.
- No database schema or migration changes.
