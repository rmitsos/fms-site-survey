import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { designRules } from "@/db/schema";
import { resolveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const ruleId = Number(id);
  if (!Number.isInteger(ruleId)) return NextResponse.json({ error: "Invalid design rule id." }, { status: 400 });

  const db = getDb();
  await db.delete(designRules).where(eq(designRules.id, ruleId));
  return NextResponse.json({ ok: true });
}
