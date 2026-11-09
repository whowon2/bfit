## Context

Next.js treats every export of a `"use server"` module as a POST-invokable endpoint addressable by action id. BFit's `actions/*.ts` files mix mutations and reads, and all of them take `userId` (or rows containing `userId`) from client components that read it off the session prop. Pages already authenticate with `auth.api.getSession()`, but the actions themselves do not.

## Goals / Non-Goals

**Goals:**
- No server action trusts caller-supplied identity; all derive it from the session.
- Every update/delete is scoped by `id AND userId`.
- Reads are unreachable as endpoints.
- Cheap, server-side zod validation of action input.

**Non-Goals:**
- UI redesign, error-toast UX changes beyond what's needed.
- Rate limiting, CSRF hardening beyond Next's built-in origin checks.
- Schema/migration changes.

## Decisions

- **`lib/session.ts` with `requireUserId()`** (`import "server-only"`): calls `auth.api.getSession({ headers: await headers() })`, throws `Error("Unauthorized")` if none. Throwing (vs returning a result object) keeps call sites simple and fails closed; client callers already run actions inside transitions. Alternative: a higher-order `authedAction()` wrapper — rejected as more abstraction than four files need.
- **Query modules `lib/queries/{weight,profile,calorie}.ts`** with `import "server-only"`. They take `userId` as a parameter (Server Components pass `session.user.id`; actions pass `requireUserId()` output). Alternative: have queries call `requireUserId()` themselves — rejected because pages already hold the session and it would duplicate session lookups.
- **Validation with zod** (already a dependency): weight `0 < v < 1000`, body fat `0..100` or null, dates via `z.coerce.date()` with validity check, profile via existing `profileFormSchema` (dates arrive as `Date` over the RSC wire). Import arrays capped at 10 000 rows; import row schemas omit `userId` and zod strips unknown keys, then the server stamps the session user id.
- **Revalidation**: drop `revalidateTag("weights")` (no tagged fetch exists); use `revalidatePath("/dashboard")` (and `/profile` where profile calcs depend on weight). Client components keep `router.refresh()`.
- **`lib/lyfta.ts`**: `convertLyftaWeights` no longer takes/emits `userId`.
- **proxy matcher**: add `/profile` and `/settings`; remains an optimistic cookie check only.

## Risks / Trade-offs

- [Throwing in actions surfaces as an uncaught error in client transitions] → acceptable; only happens for unauthenticated/malicious calls, and import components already catch errors.
- [Validation ranges reject legitimate edge-case data, e.g. very heavy users in lbs] → generous upper bound (1000) covers both kg and lbs.
- [Removing `userId` props changes component signatures] → all call sites updated in the same change; type check enforces it.

## Migration Plan

Pure code change; deploy normally. Rollback by reverting the commit. No DB migration.

## Open Questions

- None blocking.
