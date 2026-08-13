ALTER TABLE "survey_sessions" ADD COLUMN "fms_work_order_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_sessions" ADD COLUMN "survey_estimate" jsonb;--> statement-breakpoint
ALTER TABLE "survey_sessions" ADD COLUMN "estimate_pushed_at" timestamp with time zone;