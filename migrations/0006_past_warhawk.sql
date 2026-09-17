ALTER TABLE "calorie_log" ALTER COLUMN "target_calories" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "calorie_log" ADD COLUMN "protein_g" numeric(6, 1);--> statement-breakpoint
ALTER TABLE "calorie_log" ADD COLUMN "carbs_g" numeric(6, 1);--> statement-breakpoint
ALTER TABLE "calorie_log" ADD COLUMN "fat_g" numeric(6, 1);--> statement-breakpoint
ALTER TABLE "calorie_log" ADD CONSTRAINT "calorie_log_user_id_date_unique" UNIQUE("user_id","date");