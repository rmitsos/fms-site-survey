import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { waypoints } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const waypointId = Number(id);
  if (!Number.isInteger(waypointId)) return NextResponse.json({ error: "Invalid waypoint id." }, { status: 400 });

  const db = getDb();
  const waypoint = await db.query.waypoints.findFirst({ where: eq(waypoints.id, waypointId) });
  if (!waypoint) return NextResponse.json({ error: "Waypoint was not found." }, { status: 404 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) return NextResponse.json({ error: "A file field is required." }, { status: 400 });

  const extension = file.type === "image/png" ? "png" : "jpg";
  const blob = await put(`survey-photos/${waypoint.sessionId}/${waypointId}-${Date.now()}.${extension}`, file, {
    access: "public",
    contentType: file.type || "image/jpeg",
  });

  const [updated] = await db.update(waypoints).set({ photoUrl: blob.url }).where(eq(waypoints.id, waypointId)).returning();
  return NextResponse.json({ waypoint: updated });
}
