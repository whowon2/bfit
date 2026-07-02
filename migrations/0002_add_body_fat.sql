ALTER TABLE "user_profile" DROP COLUMN "target_rate";--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "target_body_fat" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "target_weeks" integer;--> statement-breakpoint
ALTER TABLE "weight" ADD COLUMN "body_fat_percent" numeric(4, 1);
