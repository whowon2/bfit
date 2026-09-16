## Context

`lib/auth.ts` builds the Better Auth instance with no `session` block, so all session lifetime behavior comes from library defaults (`node_modules/better-auth/dist/context/create-context.mjs`):

- `expiresIn`: 7 days (`3600 * 24 * 7`)
- `updateAge`: 1 day — the session's `expiresAt` only gets pushed forward when a request is handled and less than `updateAge` remains before expiry
- `cookieCache`: disabled by default (no `maxAge`), so every session read (`getSession`, page loads via `auth.api.getSession()`) hits Postgres and re-validates against `expiresAt`

The app calls `auth.api.getSession()` per server-rendered page (`app/dashboard/page.tsx`, `app/profile/page.tsx`) and `proxy.ts` only checks cookie presence, not validity. Given normal daily usage, this configuration should sustain a 7-day rolling session, but the felt experience is "logged out every day" — pointing at either the sliding window not extending far enough per visit, or short-lived state (cookie/cache) being treated as authority in the browser between visits (e.g. cookie or JWT cache expiring at the default 300s `cookieCache` window, which is disabled here at 0, meaning behavior is DB-authoritative — least likely) or simply defaults being too conservative for how this single-user-ish app is used (infrequent visits, e.g. every 24–48h, landing right at the edge of `updateAge`/`expiresIn` boundaries).

## Goals / Non-Goals

**Goals:**
- Make session lifetime explicit and long enough that normal (daily-or-less) usage never hits re-login.
- Ensure the sliding expiration reliably re-extends on activity (correct `updateAge` relative to `expiresIn`).
- Reduce reliance on tight default windows that don't fit this app's usage pattern.

**Non-Goals:**
- Changing sign-in/sign-up UX (e.g. adding a "remember me" checkbox) — out of scope, `autoSignIn` already persists sessions.
- Adding session revocation UI, multi-device session management, or refresh-token rotation.
- Fixing `proxy.ts`'s "cookie presence only" check — that's documented as an intentional optimistic redirect, not the source of unwanted logouts (worst case it under-redirects, not over-logs-out).

## Decisions

- **`expiresIn: 60 * 60 * 24 * 30` (30 days)** over keeping the 7-day default: this is a personal fitness tracker, not a high-security app; a month-long session is an acceptable trade-off for not re-prompting login on every visit. Alternative considered: leave at 7 days and only fix `updateAge`/cache — rejected because even a well-refreshed 7-day window will lapse for anyone who logs weight less than weekly.
- **`updateAge: 60 * 60 * 24` (1 day, matches current default)** — keep the library default: any active use within a day extends expiry by another full 30 days. No reason to shorten or lengthen this independent of `expiresIn`.
- **Enable `session.cookieCache: { enabled: true, maxAge: 60 * 5 }`** — reduces DB round-trips per page load without weakening security meaningfully (5 min staleness window on a fitness tracker is fine), and rules out any client-side cache-expiry edge case contributing to premature logout perception.
- **No new dependency, no schema/migration change** — this is purely `betterAuth()` config in `lib/auth.ts`.

## Risks / Trade-offs

- [Longer session = larger window for a stolen cookie to be replayed] → Acceptable for this app's threat model (personal weight-tracking data, no payment/PII beyond email); mitigated by `BETTER_AUTH_SECRET` already in place and HTTPS in production (`BETTER_AUTH_URL`).
- [`cookieCache` introduces a up-to-5-minute staleness window where a revoked/logged-out session could still read as valid client-side] → Acceptable; there's no admin-revocation flow in this app that requires immediate effect, and `logout` still clears server-side session + cookie.
- [Existing logged-in users keep their current (shorter) session until they next re-authenticate] → Expected; no migration needed, config only applies to sessions created after deploy.

## Migration Plan

1. Update `lib/auth.ts` with the new `session` block.
2. Deploy — no DB migration required (`session` table schema unchanged).
3. Existing sessions continue under old `expiresAt` until they expire or refresh; new logins get the new 30-day window immediately.
4. Rollback: revert the config change; no data cleanup needed.
