import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { designRules, segments, surveyReports, surveySessions, waypoints } from "@/db/schema";
import { resolveUser } from "@/lib/auth";
import { generateRouteProposal } from "@/lib/routeProposal";
import { getPastSurveyContext } from "@/lib/pastSurveys";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) return NextResponse.json({ error: "Invalid session id." }, { status: 400 });

  const db = getDb();
  const reports = await db.select().from(surveyReports).where(eq(surveyReports.sessionId, sessionId)).orderBy(desc(surveyReports.generatedAt));
  return NextResponse.json({ reports });
}

// Generates a route proposal for a session: past-survey retrieval + design rules are plain SQL
// lookups (lib/pastSurveys.ts, no similarity model) fed to the LLM alongside this session's own
// waypoints/segments - the LLM does the judgment, not custom ML.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) return NextResponse.json({ error: "Invalid session id." }, { status: 400 });

  const db = getDb();
  const session = await db.query.surveySessions.findFirst({ where: eq(surveySessions.id, sessionId) });
  if (!session) return NextResponse.json({ error: "Survey session was not found." }, { status: 404 });

  const sessionWaypoints = await db.select().from(waypoints).where(eq(waypoints.sessionId, sessionId)).orderBy(asc(waypoints.sequence));
  if (sessionWaypoints.length < 2) {
    return NextResponse.json({ error: "At least two waypoints are needed to propose a route." }, { status: 400 });
  }
  const sessionSegments = await db.select().from(segments).where(eq(segments.sessionId, sessionId));
  const sequenceByWaypointId = new Map(sessionWaypoints.map((w) => [w.id, w.sequence]));

  const [rules, pastSurveys] = await Promise.all([
    db.select().from(designRules).orderBy(desc(designRules.createdAt)).limit(20),
    getPastSurveyContext(sessionId, session.siteName),
  ]);

  let proposal;
  try {
    proposal = await generateRouteProposal({
      siteName: session.siteName,
      jobParameters: session.surveyEstimate,
      waypoints: sessionWaypoints.map((w) => ({ sequence: w.sequence, label: w.label, notes: w.notes })),
      segments: sessionSegments.map((s) => ({
        fromSequence: sequenceByWaypointId.get(s.fromWaypointId) ?? 0,
        toSequence: sequenceByWaypointId.get(s.toWaypointId) ?? 0,
        distanceMeters: s.distanceMeters,
        headingDegrees: s.headingDegrees,
        method: s.method,
      })),
      designRules: rules.map((r) => ({ name: r.name, category: r.category, rule: r.rule })),
      pastSurveys,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate a route proposal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const [report] = await db.insert(surveyReports).values({
    sessionId,
    status: "draft",
    proposedRoutes: proposal,
    summary: proposal.summary,
  }).returning();

  return NextResponse.json({ report }, { status: 201 });
}
