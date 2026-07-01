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
- `bunx drizzle-kit migrate` — apply migrations (also runs automatically via `postinstall`)
- `bunx drizzle-kit studio` — browse the DB

No test suite is configured in this repo.

Requires `DATABASE_URL` in `.env` (loaded via `dotenv` in `db/drizzle.ts` and `drizzle.config.ts`).

## Architecture

**Data flow**: Server Components fetch data directly via functions in `actions/*.ts` (marked `"use server"`), which query Drizzle (`db/drizzle.ts`) against tables in `db/schema.ts`. Page components (e.g. `app/dashboard/page.tsx`) call `auth.api.getSession()` to get the session, then pass `userId`/`session` down to client components as props — there is no client-side data-fetching layer.

**Auth (Better Auth)**:
- `lib/auth.ts` — server-side Better Auth instance: Drizzle adapter (`provider: "pg"`), email/password with `autoSignIn`, `nextCookies()` plugin, and a `customSession` plugin that injects `weightUnit` onto the session's user object.
- `lib/auth-client.ts` — client-side auth client (`better-auth/react`), exports the `Session` type inferred from the client.
- `app/api/auth/[...all]/route.ts` — catch-all handler wiring Better Auth into Next's route handlers via `toNextJsHandler`.
- `actions/auth.ts` — server actions (`signin`, `signup`, `logout`) called from form components (see `app/auth/signin/form.tsx`, `app/auth/signup/form.tsx`); these use `auth.api.signInEmail` / `signUpEmail` / `signOut` and `redirect()` on success.
- `proxy.ts` — optimistic redirect to `/auth/signin` for `/dashboard` based on the presence of a session cookie only (explicitly NOT a real auth check — real checks happen per-page via `auth.api.getSession()`). Next 16 renamed the `middleware.ts` convention to `proxy.ts` (export named `proxy`, same behavior).

**Database schema** (`db/schema.ts`): Better Auth's required tables (`user`, `session`, `account`, `verification`) sit alongside app tables `weight`, `userProfile`, and `calorieLog`, all foreign-keyed to `user.id` with `onDelete: "cascade"`. `weight` and other numeric fields use Drizzle `decimal` (returned as strings — callers `.toString()` values before insert and parse on read). `userProfile.goal`/`calorieLog.phase` use a shared `"cut" | "bulk" | "maintain"` union typed via `$type<>()`.

**Weight actions** (`actions/weight.ts`): CRUD plus aggregate queries (`getWeeklyAverages` via `DATE_TRUNC`, `getTodayWeight` via `DATE(...) = CURRENT_DATE`) using raw `sql` template fragments for Postgres-specific logic. Mutations call `revalidateTag("weights")`.

**Profile gating**: Both `app/dashboard/page.tsx` and `app/profile/page.tsx` check `getProfile(userId)` and render `CreateProfileForm` (`app/profile/create-form.tsx`) instead of the normal page when no profile exists yet — profile creation is a prerequisite gate rather than a separate onboarding route.

**UI components**: `components/ui/*` are ShadCN primitives (excluded from Biome linting per `biome.json`'s `!components/ui` — do not hand-edit their formatting/lint issues, regenerate via ShadCN CLI instead). `components.json` config: `new-york` style, `neutral` base color, no Tailwind prefix, aliases `@/components`, `@/lib`, `@/components/ui`, `@/hooks`. Feature components live directly in `components/` (e.g. `add-weight.tsx`, `progress-chart.tsx`, `weight-list.tsx`, `import-weights.tsx`, `export-json.tsx`).

**Path alias**: `@/*` maps to repo root (see `tsconfig.json`).
