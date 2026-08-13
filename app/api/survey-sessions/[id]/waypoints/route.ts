import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { segments, surveySessions, waypoints } from "@/db/schema";
import { segmentGeometry } from "@/lib/waypoints";
import { resolveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// Appends the next waypoint to a session and, if there's a previous one, the segment connecting
// them - distance/heading computed by segmentGeometry's manual > gps > client-supplied
// DeviceMotion reading > mixed-fallback precedence.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) return NextResponse.json({ error: "Invalid session id." }, { status: 400 });

  let body: {
    label?: unknown; notes?: unknown;
    gpsLat?: unknown; gpsLng?: unknown;
    estimatedLat?: unknown; estimatedLng?: unknown;
    manualLat?: unknown; manualLng?: unknown;
    motionDistanceMeters?: unknown; motionHeadingDegrees?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const db = getDb();
  const session = await db.query.surveySessions.findFirst({ where: eq(surveySessions.id, sessionId) });
  if (!session) return NextResponse.json({ error: "Survey session was not found." }, { status: 404 });

  const previous = (await db.select().from(waypoints).where(eq(waypoints.sessionId, sessionId)).orderBy(desc(waypoints.sequence)).limit(1))[0] ?? null;
  const sequence = (previous?.sequence ?? 0) + 1;

  const [waypoint] = await db.insert(waypoints).values({
    sessionId,
    sequence,
    label: typeof body.label === "string" ? body.label : "",
    notes: typeof body.notes === "string" ? body.notes : "",
    gpsLat: num(body.gpsLat),
    gpsLng: num(body.gpsLng),
    estimatedLat: num(body.estimatedLat),
    estimatedLng: num(body.estimatedLng),
    manualLat: num(body.manualLat),
    manualLng: num(body.manualLng),
  }).returning();

  let segment = null;
  if (previous) {
    const geometry = segmentGeometry(previous, waypoint, {
      distanceMeters: num(body.motionDistanceMeters),
      headingDegrees: num(body.motionHeadingDegrees),
    });
    [segment] = await db.insert(segments).values({
      sessionId,
      fromWaypointId: previous.id,
      toWaypointId: waypoint.id,
      distanceMeters: geometry.distanceMeters,
      headingDegrees: geometry.headingDegrees,
      method: geometry.method,
    }).returning();
  }

  if (session.status === "draft") {
    await db.update(surveySessions).set({ status: "in_progress" }).where(eq(surveySessions.id, sessionId));
  }

  return NextResponse.json({ waypoint, segment }, { status: 201 });
}
