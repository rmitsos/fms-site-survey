import { pgTable, serial, text, integer, boolean, doublePrecision, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { JobParameters } from "@/lib/jobParameters";

// Field surveyors, identified by email. No roles - everyone with an account can run surveys;
// isAdmin only gates inviting other users (see lib/auth.ts).
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  active: boolean("active").notNull().default(true),
  // Empty = no PIN set yet - the next login attempt sets whatever PIN is typed as this user's
  // real PIN (used both for brand-new users and for an admin-triggered reset).
  pinHash: text("pin_hash").notNull().default(""),
  failedPinAttempts: integer("failed_pin_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

// Server-side sessions rather than a JWT - lets a lost/stolen field device's access be revoked
// immediately (delete the row) instead of waiting for a token to expire.
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // random token, used directly as the session cookie's value
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// One row per site visit. Waypoints/segments/reports all hang off a session.
export const surveySessions = pgTable("survey_sessions", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull(),
  status: text("status").notNull().default("draft"), // draft | in_progress | completed
  createdBy: text("created_by").notNull().default(""),
  notes: text("notes").notNull().default(""),
  // FMS work_orders.customer_work_id this session budgets for - required to push an estimate.
  fmsWorkOrderId: text("fms_work_order_id").notNull().default(""),
  // JobParameters-shaped (see lib/jobParameters.ts), mirroring FMS's work_orders.survey_estimate
  // shape so it can be pushed there as-is.
  surveyEstimate: jsonb("survey_estimate").$type<JobParameters>(),
  estimatePushedAt: timestamp("estimate_pushed_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().default(sql`now()`),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// A single surveyed point. gps* is a raw fix when available; estimated* is the DeviceMotion
// dead-reckoned position (accumulated from the previous waypoint) used indoors where GPS is
// absent or unreliable; manual* is a human correction and, when set, is authoritative over both.
export const waypoints = pgTable("waypoints", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => surveySessions.id),
  sequence: integer("sequence").notNull(),
  label: text("label").notNull().default(""),
  gpsLat: doublePrecision("gps_lat"),
  gpsLng: doublePrecision("gps_lng"),
  estimatedLat: doublePrecision("estimated_lat"),
  estimatedLng: doublePrecision("estimated_lng"),
  manualLat: doublePrecision("manual_lat"),
  manualLng: doublePrecision("manual_lng"),
  photoUrl: text("photo_url"),
  notes: text("notes").notNull().default(""),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// The traveled path between two consecutive waypoints in a session.
export const segments = pgTable("segments", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => surveySessions.id),
  fromWaypointId: integer("from_waypoint_id").notNull().references(() => waypoints.id),
  toWaypointId: integer("to_waypoint_id").notNull().references(() => waypoints.id),
  distanceMeters: doublePrecision("distance_meters"),
  headingDegrees: doublePrecision("heading_degrees"),
  method: text("method").notNull().default("sensor"), // gps | sensor | manual
  notes: text("notes").notNull().default(""),
});

// Reusable install/cabling constraints (e.g. min clearance, max cable run) fed to the LLM
// alongside past surveys when it proposes routes - not evaluated in code, just prompt context.
export const designRules = pgTable("design_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default(""),
  rule: text("rule").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// LLM-generated route proposals for a session, produced from that session's waypoints/segments
// plus past-survey retrieval and design_rules context.
export const surveyReports = pgTable("survey_reports", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => surveySessions.id),
  status: text("status").notNull().default("draft"), // draft | approved | sent
  proposedRoutes: jsonb("proposed_routes").notNull(),
  summary: text("summary").notNull().default(""),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
