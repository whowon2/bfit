# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BFit is a Next.js 16 (App Router) fitness tracker: weight logging, progress charts, JSON import/export, email/password auth. Uses TypeScript, Drizzle ORM + Postgres, Better Auth, Tailwind v4, ShadCN/UI (Radix), Recharts, Biome. Package manager is bun (`bun.lock`).

## Commands

- `bun dev` — start dev server (Turbopack)
- `bun run build` — production build (Turbopack)
- `bun start` — run production build
- `bun run lint` — Biome check (lint + import organization)
- `bun run format` — Biome format, writes in place
- `bunx drizzle-kit generate` — generate a new migration from `db/schema.ts` changes
- `bunx drizzle-kit migrate` — apply migrations (also run by `bun run build` via `scripts/migrate-if-production.mjs` except on Vercel previews). Migration `0007` backfills calendar days in the timezone from the custom setting `bfit.backfill_timezone` (default UTC), e.g. `PGOPTIONS="-c bfit.backfill_timezone=Europe/Madrid" bunx drizzle-kit migrate`
- `bunx drizzle-kit studio` — browse the DB

No test suite is configured in this repo.

Requires `DATABASE_URL` in `.env` (loaded via `dotenv` in `db/drizzle.ts` and `drizzle.config.ts`).

## Architecture

**Data flow**: Reads and writes are split.
- **Reads** live in `lib/queries/*.ts` (`weight.ts`, `profile.ts`, `calorie.ts`), guarded by `import "server-only"`. Server Components (e.g. `app/dashboard/page.tsx`) call `auth.api.getSession()`, then pass `session.user.id` into these query functions. Never put read helpers in a `"use server"` file — every export there is a public POST endpoint.
- **Writes** are server actions in `actions/*.ts` (`"use server"`): `weight.ts`, `profile.ts`, `calorie.ts`, `settings.ts`, `auth.ts`. Every action derives the user via `requireUserId()` / `requireUser()` from `lib/session.ts` (throws `Unauthorized` without a session; `requireUser()` also returns the user's timezone read from the DB, not the session cookie cache) and MUST NOT accept a `userId` argument. Updates/deletes filter by both row id AND session userId; inputs are validated with zod server side (import rows are re-parsed, unknown keys such as `userId` stripped, and stamped with the session user). Actions call `revalidatePath(...)`; client components also call `router.refresh()`.
- Client components never receive `userId`; there is no client-side data-fetching layer.

**Auth (Better Auth)**:
- `lib/auth.ts` — server-side Better Auth instance: Drizzle adapter (`provider: "pg"`), email/password with `autoSignIn`, `nextCookies()` plugin, and `user.additionalFields` `weightUnit` and `timezone` (both `input: false`) so `session.user.weightUnit` / `session.user.timezone` reflect the `user` row. Session cookie cache is 5 min; `updateWeightUnit` / `updateTimezone` re-read the session with `disableCookieCache: true` to rewrite the cache immediately. `signup` writes the browser timezone (hidden form value) directly to the new user row.
- `lib/auth-client.ts` — client-side auth client (`better-auth/react`), exports the `Session` type inferred from the client.
- `app/api/auth/[...all]/route.ts` — catch-all handler wiring Better Auth into Next's route handlers via `toNextJsHandler`.
- `actions/auth.ts` — server actions (`signin`, `signup`, `logout`) called from form components (see `app/auth/signin/form.tsx`, `app/auth/signup/form.tsx`); these use `auth.api.signInEmail` / `signUpEmail` / `signOut` and `redirect()` on success.
- `proxy.ts` — optimistic redirect to `/auth/signin` for `/dashboard`, `/profile` and `/settings` based on the presence of a session cookie only (explicitly NOT a real auth check — real checks happen per-page via `auth.api.getSession()` and per-action via `requireUserId()`). Next 16 renamed the `middleware.ts` convention to `proxy.ts` (export named `proxy`, same behavior).

**Database schema** (`db/schema.ts`): Better Auth's required tables (`user`, `session`, `account`, `verification`) sit alongside app tables `weight`, `userProfile`, `calorieLog` and `profileHistory`, all foreign-keyed to `user.id` with `onDelete: "cascade"`. `weight` and other numeric fields use Drizzle `decimal` (returned as strings — callers `.toString()` values before insert and parse on read). `userProfile.goal` is `"cut" | "bulk" | "maintain"` via `$type<>()`.

**Dates & timezones**: `user.timezone` (IANA name; `null` = not detected yet, treated as UTC) is the single source of truth for instant -> calendar day. It is captured at sign-up, filled once by `components/timezone-sync.tsx` (rendered by the sidebar while null; never overrides a set value) and editable in Settings. `weight.date` and `calorie_log.date` are Postgres `date` columns (Drizzle returns `"YYYY-MM-DD"` strings), each unique per `(user_id, date)`; the precise weigh-in instant is the nullable `weight.measured_at` (`timestamptz`, null = time unknown). Use `lib/dates.ts` (`dayInTimeZone`, `todayInTimeZone`, `zonedTimeToInstant`, `timeInTimeZone`, `parseDay`, `formatDay`, `isDayString`) — never `startOfDay` or `toISOString().slice(0, 10)` on instants. Server code resolves days in the user's timezone; client code turns stored day strings into local-midnight `Date`s only for display/pickers (`parseDay`) and sends days back as strings (`formatDay`).

**Weight actions** (`actions/weight.ts`): `addWeightEntry`, `updateWeightEntry`, `removeWeightEntry`, `importWeightEntries` — all session-scoped and zod-validated (value `0 < v < 1000`, body fat `0..100`, imports capped at 10k rows). One entry per user per day: add and import upsert on `(user_id, date)` (value and time replaced, body fat kept when the new entry has none; `addWeightEntry` returns `{ replaced }`), import rows are de-duplicated per day first (latest instant wins), and `updateWeightEntry` returns `{ ok: false, error }` instead of moving an entry onto an occupied day. MFP nutrition CSV days stay strings end to end (`lib/mfp.ts` -> `importCalorieEntries`, upsert per day). Weight reads (`getWeightEntries`, `getLatestWeight`, `getLatestBodyFat`) are in `lib/queries/weight.ts`. Profile create/update live in `actions/profile.ts` and re-validate with `profileFormSchema`.

**Weight units**: weight values are always stored in kg. `lib/units.ts` holds the only kg<->lbs conversion (`displayWeight`, `toStoredKg`, `roundForUnit`, `toWeightUnit`). Pages pass `toWeightUnit(session.user.weightUnit)` to client components, which convert for display and convert input to kg before calling actions — weight server actions accept kg only. Imports go through `lib/weight-import.ts` `parseWeightImport` (Lyfta by its `unit`, day taken from its naive local date string; BFit export object `{ format: "bfit-weights", version, unit, weights }` — v2 rows carry `date` (day) + `measuredAt`, v1 rows only an instant whose day the server derives in the user's timezone; legacy plain array = kg, v1). Nutrition math, height (cm) and body fat % are unit-independent.

**Nutrition** (`lib/nutrition.ts`): BMR/TDEE are computed, never stored (no maintenance/current calorie inputs). `goal` sets the direction of the calorie change in `computeCalcSnapshot` (`maintain` -> 0, `cut` -> never a surplus, `bulk` -> never a deficit); `goalConflict` checks target body fat against the latest measured body fat in both profile forms (inline, blocks submit) and in `createProfile`/`updateProfile` (throws). Calorie targets over time are derivable from `profile_history`; old history entries can mention removed fields (`maintenanceCalories`, `currentCalories`) and must keep rendering (labels in `app/profile/page.tsx`). `birthDate` is a calendar day (server converts the picked date with the user's timezone).

**Profile gating**: Both `app/dashboard/page.tsx` and `app/profile/page.tsx` check `getProfile(userId)` and render `CreateProfileForm` (`app/profile/create-form.tsx`) instead of the normal page when no profile exists yet — profile creation is a prerequisite gate rather than a separate onboarding route.

**UI components**: `components/ui/*` are ShadCN primitives (excluded from Biome linting per `biome.json`'s `!components/ui` — do not hand-edit their formatting/lint issues, regenerate via ShadCN CLI instead). `components.json` config: `new-york` style, `neutral` base color, no Tailwind prefix, aliases `@/components`, `@/lib`, `@/components/ui`, `@/hooks`. Feature components live directly in `components/` (e.g. `add-weight.tsx`, `progress-chart.tsx`, `weight-list.tsx`, `import-weights.tsx`, `export-json.tsx`).

**Path alias**: `@/*` maps to repo root (see `tsconfig.json`).
