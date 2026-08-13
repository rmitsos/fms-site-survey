CREATE TABLE "design_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"rule" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"from_waypoint_id" integer NOT NULL,
	"to_waypoint_id" integer NOT NULL,
	"distance_meters" double precision,
	"heading_degrees" double precision,
	"method" text DEFAULT 'sensor' NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"proposed_routes" jsonb NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "waypoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"gps_lat" double precision,
	"gps_lng" double precision,
	"estimated_lat" double precision,
	"estimated_lng" double precision,
	"manual_lat" double precision,
	"manual_lng" double precision,
	"photo_url" text,
	"notes" text DEFAULT '' NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_session_id_survey_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."survey_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_from_waypoint_id_waypoints_id_fk" FOREIGN KEY ("from_waypoint_id") REFERENCES "public"."waypoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_to_waypoint_id_waypoints_id_fk" FOREIGN KEY ("to_waypoint_id") REFERENCES "public"."waypoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_reports" ADD CONSTRAINT "survey_reports_session_id_survey_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."survey_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waypoints" ADD CONSTRAINT "waypoints_session_id_survey_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."survey_sessions"("id") ON DELETE no action ON UPDATE no action;