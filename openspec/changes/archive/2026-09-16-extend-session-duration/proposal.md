## Why

Session gets logged out too often. `lib/auth.ts` sets no explicit `session` config, so Better Auth default applies: 7-day session `expiresIn`, but that 7 days only extends when `getSession` runs within `updateAge` (1 day) of expiry — and the app never calls `getSession`/refresh on a cadence that guarantees this, and there's no `cookieCache` to reduce staleness. Net effect for daily/light usage: sessions read as expired sooner than the intended 7 days, forcing frequent re-login. Fix: make session lifetime explicit, long, and reliably refreshed.

## What Changes

- Add explicit `session` config to `lib/auth.ts`: longer `expiresIn` (30 days) and `updateAge` (1 day, refreshed on any active use) so sliding expiration behaves as expected.
- Enable `session.cookieCache` so session reads don't rely on a stale/short-lived cookie between DB refreshes.
- No changes to sign-in/sign-up/logout flows or UI.

## Capabilities

### New Capabilities
- `session-duration`: how long an authenticated session stays valid without requiring re-login, and how that lifetime is extended/cached.

### Modified Capabilities
(none)

## Impact

- `lib/auth.ts` — add `session: { expiresIn, updateAge, cookieCache }` to the `betterAuth()` config.
- No schema, migration, or UI changes.
- Existing sessions unaffected until next login (new config applies to newly issued sessions).
