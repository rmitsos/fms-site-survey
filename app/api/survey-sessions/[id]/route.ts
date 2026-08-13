import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { surveySessions } from "@/db/schema";
import { getSessionDetail } from "@/lib/sessionDetail";
import { JOB_PARAMETER_KEYS, type JobParameters } from "@/lib/jobParameters";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseSessionId(id: string): number | null {
  const sessionId = Number(id);
  return Number.isInteger(sessionId) ? sessionId : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const sessionId = parseSessionId(id);
  if (sessionId === null) return NextResponse.json({ error: "Invalid session id." }, { status: 400 });

  const detail = await getSessionDetail(sessionId);
  if (!detail) return NextResponse.json({ error: "Survey session was not found." }, { status: 404 });

  return NextResponse.json(detail);
}

function sanitizeSurveyEstimate(input: unknown): JobParameters {
  const out: Record<string, unknown> = {};
  if (input && typeof input === "object") {
    for (const key of JOB_PARAMETER_KEYS) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined && value !== null) out[key] = value;
    }
  }
  return out as JobParameters;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const sessionId = parseSessionId(id);
  if (sessionId === null) return NextResponse.json({ error: "Invalid session id." }, { status: 400 });

  let body: {
    siteName?: unknown; fmsWorkOrderId?: unknown; notes?: unknown;
    status?: unknown; surveyEstimate?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.query.surveySessions.findFirst({ where: eq(surveySessions.id, sessionId) });
  if (!existing) return NextResponse.json({ error: "Survey session was not found." }, { status: 404 });

  const updates: Partial<typeof surveySessions.$inferInsert> = {};
  if (typeof body.siteName === "string" && body.siteName.trim()) updates.siteName = body.siteName.trim();
  if (typeof body.fmsWorkOrderId === "string") updates.fmsWorkOrderId = body.fmsWorkOrderId.trim();
  if (typeof body.notes === "string") updates.notes = body.notes;
  if (typeof body.surveyEstimate === "object") updates.surveyEstimate = sanitizeSurveyEstimate(body.surveyEstimate);
  if (body.status === "draft" || body.status === "in_progress" || body.status === "completed") {
    updates.status = body.status;
    if (body.status === "completed" && !existing.completedAt) updates.completedAt = new Date();
  }

  const [session] = await db.update(surveySessions).set(updates).where(eq(surveySessions.id, sessionId)).returning();
  return NextResponse.json({ session });
}
