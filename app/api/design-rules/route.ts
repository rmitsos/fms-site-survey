import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { designRules } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const db = getDb();
  const rules = await db.select().from(designRules).orderBy(desc(designRules.createdAt));
  return NextResponse.json({ designRules: rules });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { name?: unknown; category?: unknown; rule?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rule = typeof body.rule === "string" ? body.rule.trim() : "";
  if (!name || !rule) return NextResponse.json({ error: "Name and rule text are required." }, { status: 400 });

  const db = getDb();
  const [designRule] = await db.insert(designRules).values({
    name,
    category: typeof body.category === "string" ? body.category.trim() : "",
    rule,
  }).returning();

  return NextResponse.json({ designRule }, { status: 201 });
}
