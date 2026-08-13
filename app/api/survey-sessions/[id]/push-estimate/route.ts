import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { surveySessions } from "@/db/schema";
import { pushSurveyEstimate } from "@/lib/fmsClient";
import { JOB_PARAMETER_KEYS, type JobParameters } from "@/lib/jobParameters";
import { resolveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

// Pushes a session's surveyEstimate to FMS (work_orders.survey_estimate) via the shared-secret
// endpoint there. Separate from just saving the estimate locally, since a push is a distinct,
// user-triggered action ("send this to FMS") that can fail independently of local persistence.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) return NextResponse.json({ error: "Invalid session id." }, { status: 400 });

  const db = getDb();
  const session = await db.query.surveySessions.findFirst({ where: eq(surveySessions.id, sessionId) });
  if (!session) return NextResponse.json({ error: "Survey session was not found." }, { status: 404 });
  if (!session.fmsWorkOrderId) return NextResponse.json({ error: "Session has no linked FMS work order." }, { status: 400 });
  if (!session.surveyEstimate) return NextResponse.json({ error: "Session has no survey estimate to push." }, { status: 400 });

  const surveyEstimate = sanitizeSurveyEstimate(session.surveyEstimate);
  try {
    await pushSurveyEstimate(session.fmsWorkOrderId, surveyEstimate);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach FMS.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await db.update(surveySessions).set({ estimatePushedAt: new Date() }).where(eq(surveySessions.id, sessionId));

  return NextResponse.json({ ok: true });
}
