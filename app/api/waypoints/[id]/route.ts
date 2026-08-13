import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { segments, waypoints } from "@/db/schema";
import { segmentGeometry } from "@/lib/waypoints";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Recomputes the segment ending at (fromId -> waypointId) and/or starting from (waypointId ->
 * toId) this waypoint, using its current stored position - called after any edit to a waypoint's
 * coordinates so a manual correction propagates into both neighboring segments. */
async function recomputeAdjacentSegments(db: ReturnType<typeof getDb>, waypointId: number) {
  const [incoming, outgoing] = await Promise.all([
    db.query.segments.findFirst({ where: eq(segments.toWaypointId, waypointId) }),
    db.query.segments.findFirst({ where: eq(segments.fromWaypointId, waypointId) }),
  ]);

  for (const segment of [incoming, outgoing]) {
    if (!segment) continue;
    const [fromWp, toWp] = await Promise.all([
      db.query.waypoints.findFirst({ where: eq(waypoints.id, segment.fromWaypointId) }),
      db.query.waypoints.findFirst({ where: eq(waypoints.id, segment.toWaypointId) }),
    ]);
    if (!fromWp || !toWp) continue;
    const geometry = segmentGeometry(fromWp, toWp);
    await db.update(segments).set({
      distanceMeters: geometry.distanceMeters,
      headingDegrees: geometry.headingDegrees,
      method: geometry.method,
    }).where(eq(segments.id, segment.id));
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const waypointId = Number(id);
  if (!Number.isInteger(waypointId)) return NextResponse.json({ error: "Invalid waypoint id." }, { status: 400 });

  let body: { manualLat?: unknown; manualLng?: unknown; label?: unknown; notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.query.waypoints.findFirst({ where: eq(waypoints.id, waypointId) });
  if (!existing) return NextResponse.json({ error: "Waypoint was not found." }, { status: 404 });

  const updates: Partial<typeof waypoints.$inferInsert> = {};
  if ("manualLat" in body) updates.manualLat = num(body.manualLat);
  if ("manualLng" in body) updates.manualLng = num(body.manualLng);
  if (typeof body.label === "string") updates.label = body.label;
  if (typeof body.notes === "string") updates.notes = body.notes;

  const [waypoint] = await db.update(waypoints).set(updates).where(eq(waypoints.id, waypointId)).returning();

  if ("manualLat" in body || "manualLng" in body) {
    await recomputeAdjacentSegments(db, waypointId);
  }

  return NextResponse.json({ waypoint });
}
