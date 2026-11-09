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
- `bunx drizzle-kit migrate` — apply migrations (run manually; not wired into `postinstall`)
- `bunx drizzle-kit studio` — browse the DB

No test suite is configured in this repo.

Requires `DATABASE_URL` in `.env` (loaded via `dotenv` in `db/drizzle.ts` and `drizzle.config.ts`).

## Architecture

**Data flow**: Reads and writes are split.
- **Reads** live in `lib/queries/*.ts` (`weight.ts`, `profile.ts`, `calorie.ts`), guarded by `import "server-only"`. Server Components (e.g. `app/dashboard/page.tsx`) call `auth.api.getSession()`, then pass `session.user.id` into these query functions. Never put read helpers in a `"use server"` file — every export there is a public POST endpoint.
- **Writes** are server actions in `actions/*.ts` (`"use server"`): `weight.ts`, `profile.ts`, `calorie.ts`, `settings.ts`, `auth.ts`. Every action derives the user via `requireUserId()` from `lib/session.ts` (throws `Unauthorized` without a session) and MUST NOT accept a `userId` argument. Updates/deletes filter by both row id AND session userId; inputs are validated with zod server side (import rows are re-parsed, unknown keys such as `userId` stripped, and stamped with the session user). Actions call `revalidatePath(...)`; client components also call `router.refresh()`.
- Client components never receive `userId`; there is no client-side data-fetching layer.

**Auth (Better Auth)**:
- `lib/auth.ts` — server-side Better Auth instance: Drizzle adapter (`provider: "pg"`), email/password with `autoSignIn`, `nextCookies()` plugin, and `user.additionalFields.weightUnit` (`input: false`) so `session.user.weightUnit` reflects `user.weight_unit`. Session cookie cache is 5 min; `updateWeightUnit` re-reads the session with `disableCookieCache: true` to rewrite the cache immediately.
- `lib/auth-client.ts` — client-side auth client (`better-auth/react`), exports the `Session` type inferred from the client.
- `app/api/auth/[...all]/route.ts` — catch-all handler wiring Better Auth into Next's route handlers via `toNextJsHandler`.
- `actions/auth.ts` — server actions (`signin`, `signup`, `logout`) called from form components (see `app/auth/signin/form.tsx`, `app/auth/signup/form.tsx`); these use `auth.api.signInEmail` / `signUpEmail` / `signOut` and `redirect()` on success.
- `proxy.ts` — optimistic redirect to `/auth/signin` for `/dashboard`, `/profile` and `/settings` based on the presence of a session cookie only (explicitly NOT a real auth check — real checks happen per-page via `auth.api.getSession()` and per-action via `requireUserId()`). Next 16 renamed the `middleware.ts` convention to `proxy.ts` (export named `proxy`, same behavior).

**Database schema** (`db/schema.ts`): Better Auth's required tables (`user`, `session`, `account`, `verification`) sit alongside app tables `weight`, `userProfile`, and `calorieLog`, all foreign-keyed to `user.id` with `onDelete: "cascade"`. `weight` and other numeric fields use Drizzle `decimal` (returned as strings — callers `.toString()` values before insert and parse on read). `userProfile.goal`/`calorieLog.phase` use a shared `"cut" | "bulk" | "maintain"` union typed via `$type<>()`.

**Weight actions** (`actions/weight.ts`): `addWeightEntry`, `updateWeightEntry`, `removeWeightEntry`, `importWeightEntries` — all session-scoped and zod-validated (value `0 < v < 1000`, body fat `0..100`, imports capped at 10k rows). Weight reads (`getWeightEntries`, `getLatestWeight`, `getLatestBodyFat`) are in `lib/queries/weight.ts`. Profile create/update live in `actions/profile.ts` and re-validate with `profileFormSchema`.

**Weight units**: weight values are always stored in kg. `lib/units.ts` holds the only kg<->lbs conversion (`displayWeight`, `toStoredKg`, `roundForUnit`, `toWeightUnit`). Pages pass `toWeightUnit(session.user.weightUnit)` to client components, which convert for display and convert input to kg before calling actions — weight server actions accept kg only. Imports go through `lib/weight-import.ts` `parseWeightImport` (Lyfta by its `unit`, BFit export object `{ format: "bfit-weights", version, unit, weights }`, legacy plain array = kg). Nutrition math, height (cm) and body fat % are unit-independent.

**Profile gating**: Both `app/dashboard/page.tsx` and `app/profile/page.tsx` check `getProfile(userId)` and render `CreateProfileForm` (`app/profile/create-form.tsx`) instead of the normal page when no profile exists yet — profile creation is a prerequisite gate rather than a separate onboarding route.

**UI components**: `components/ui/*` are ShadCN primitives (excluded from Biome linting per `biome.json`'s `!components/ui` — do not hand-edit their formatting/lint issues, regenerate via ShadCN CLI instead). `components.json` config: `new-york` style, `neutral` base color, no Tailwind prefix, aliases `@/components`, `@/lib`, `@/components/ui`, `@/hooks`. Feature components live directly in `components/` (e.g. `add-weight.tsx`, `progress-chart.tsx`, `weight-list.tsx`, `import-weights.tsx`, `export-json.tsx`).

**Path alias**: `@/*` maps to repo root (see `tsconfig.json`).
