import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { surveySessions } from "@/db/schema";
import { resolveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const db = getDb();
  const sessions = await db.select().from(surveySessions).orderBy(desc(surveySessions.startedAt));
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { siteName?: unknown; fmsWorkOrderId?: unknown; notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const siteName = typeof body.siteName === "string" ? body.siteName.trim() : "";
  if (!siteName) return NextResponse.json({ error: "siteName is required." }, { status: 400 });

  const db = getDb();
  const [session] = await db.insert(surveySessions).values({
    siteName,
    fmsWorkOrderId: typeof body.fmsWorkOrderId === "string" ? body.fmsWorkOrderId.trim() : "",
    createdBy: user.fullName,
    notes: typeof body.notes === "string" ? body.notes : "",
  }).returning();

  return NextResponse.json({ session }, { status: 201 });
}
