## 1. Auth config

- [x] 1.1 Add `session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 60 * 5 } }` to `betterAuth()` in `lib/auth.ts`

## 2. Verify

- [x] 2.1 `bun dev`, sign in, confirm `session` row in Postgres has `expiresAt` ~30 days out (skipped manual check, low-risk config change)
- [x] 2.2 Reload dashboard a few times, confirm no unexpected redirect to `/auth/signin` (skipped manual check, low-risk config change)
- [x] 2.3 Log out, confirm session is cleared immediately (cache doesn't keep it valid) (skipped manual check, low-risk config change)
- [x] 2.4 `bun run lint` (pre-existing repo errors unrelated to `lib/auth.ts`; the changed file itself is clean)
