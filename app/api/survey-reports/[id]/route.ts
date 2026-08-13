import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { surveyReports } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId)) return NextResponse.json({ error: "Invalid report id." }, { status: 400 });

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (body.status !== "draft" && body.status !== "approved" && body.status !== "sent") {
    return NextResponse.json({ error: "status must be draft, approved, or sent." }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.query.surveyReports.findFirst({ where: eq(surveyReports.id, reportId) });
  if (!existing) return NextResponse.json({ error: "Report was not found." }, { status: 404 });

  const [report] = await db.update(surveyReports).set({ status: body.status }).where(eq(surveyReports.id, reportId)).returning();
  return NextResponse.json({ report });
}
