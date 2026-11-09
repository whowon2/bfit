-- data-model-cleanup (hand-edited after drizzle-kit generate).
--
-- Backfill timezone: existing timestamps are stored as UTC wall clock. Their
-- calendar day is computed in the timezone given by the custom setting
-- `bfit.backfill_timezone` (e.g. PGOPTIONS="-c bfit.backfill_timezone=Europe/Madrid"
-- bunx drizzle-kit migrate), defaulting to 'UTC' when it is not set.
--
-- DATA CHANGES:
--   * weight: per (user, day) only the latest weigh-in is kept (ties: highest
--     id); its missing body fat is filled from the latest non-null body fat of
--     that day; the other rows of that day are DELETED.
--   * calorie_log: day = nearest midnight of the stored timestamp; same-day
--     duplicates keep the most recently updated row, others are DELETED.
--   * DROPPED columns: calorie_log.target_calories, calorie_log.phase,
--     user_profile.maintenance_calories, user_profile.current_calories.

-- Fails fast (aborting the migration) if bfit.backfill_timezone is not a valid timezone.
SELECT now() AT TIME ZONE COALESCE(NULLIF(current_setting('bfit.backfill_timezone', true), ''), 'UTC');--> statement-breakpoint

ALTER TABLE "user" ADD COLUMN "timezone" text;--> statement-breakpoint
UPDATE "user"
SET "timezone" = current_setting('bfit.backfill_timezone', true)
WHERE "timezone" IS NULL
  AND NULLIF(current_setting('bfit.backfill_timezone', true), '') IS NOT NULL;--> statement-breakpoint

-- weight: keep the exact instant in measured_at.
ALTER TABLE "weight" ADD COLUMN "measured_at" timestamp with time zone;--> statement-breakpoint
UPDATE "weight" SET "measured_at" = "date" AT TIME ZONE 'UTC';--> statement-breakpoint

-- weight: carry the day's latest body fat over to the row that will be kept.
WITH ranked AS (
  SELECT
    "id",
    "user_id",
    "body_fat_percent",
    "measured_at",
    ("measured_at" AT TIME ZONE COALESCE(NULLIF(current_setting('bfit.backfill_timezone', true), ''), 'UTC'))::date AS "day",
    row_number() OVER (
      PARTITION BY "user_id", ("measured_at" AT TIME ZONE COALESCE(NULLIF(current_setting('bfit.backfill_timezone', true), ''), 'UTC'))::date
      ORDER BY "measured_at" DESC, "id" DESC
    ) AS "rn"
  FROM "weight"
),
latest_bf AS (
  SELECT DISTINCT ON ("user_id", "day") "user_id", "day", "body_fat_percent"
  FROM ranked
  WHERE "body_fat_percent" IS NOT NULL
  ORDER BY "user_id", "day", "measured_at" DESC, "id" DESC
)
UPDATE "weight" AS w
SET "body_fat_percent" = latest_bf."body_fat_percent"
FROM ranked
JOIN latest_bf ON latest_bf."user_id" = ranked."user_id" AND latest_bf."day" = ranked."day"
WHERE w."id" = ranked."id"
  AND ranked."rn" = 1
  AND w."body_fat_percent" IS NULL;--> statement-breakpoint

-- weight: delete all but the latest weigh-in per (user, day).
DELETE FROM "weight" AS w
USING (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "user_id", ("measured_at" AT TIME ZONE COALESCE(NULLIF(current_setting('bfit.backfill_timezone', true), ''), 'UTC'))::date
      ORDER BY "measured_at" DESC, "id" DESC
    ) AS "rn"
  FROM "weight"
) AS ranked
WHERE w."id" = ranked."id" AND ranked."rn" > 1;--> statement-breakpoint

-- weight.date: timestamp -> calendar day (weight_user_id_date_unique now means one per day).
ALTER TABLE "weight" ALTER COLUMN "date" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "weight" ALTER COLUMN "date" SET DATA TYPE date
  USING ("measured_at" AT TIME ZONE COALESCE(NULLIF(current_setting('bfit.backfill_timezone', true), ''), 'UTC'))::date;--> statement-breakpoint

-- calorie_log: rows were written as browser-local midnight; rounding the UTC
-- wall clock to the nearest midnight recovers the local day for offsets < 12h.
DELETE FROM "calorie_log" AS c
USING (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "user_id", ("date" + interval '12 hours')::date
      ORDER BY "updated_at" DESC, "id" DESC
    ) AS "rn"
  FROM "calorie_log"
) AS ranked
WHERE c."id" = ranked."id" AND ranked."rn" > 1;--> statement-breakpoint
ALTER TABLE "calorie_log" ALTER COLUMN "date" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "calorie_log" ALTER COLUMN "date" SET DATA TYPE date
  USING ("date" + interval '12 hours')::date;--> statement-breakpoint

-- Unused columns.
ALTER TABLE "calorie_log" DROP COLUMN "target_calories";--> statement-breakpoint
ALTER TABLE "calorie_log" DROP COLUMN "phase";--> statement-breakpoint
ALTER TABLE "user_profile" DROP COLUMN "maintenance_calories";--> statement-breakpoint
ALTER TABLE "user_profile" DROP COLUMN "current_calories";
