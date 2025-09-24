CREATE TABLE "weight" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"value" numeric(5, 2) NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weight" ADD CONSTRAINT "weight_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;