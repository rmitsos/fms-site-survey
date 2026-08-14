import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

function baseUrl(): string {
  const url = process.env.FMS_BASE_URL;
  if (!url) throw new Error("FMS_BASE_URL is not set.");
  return url.replace(/\/+$/, "");
}

function sharedSecret(): string {
  const secret = process.env.FMS_SHARED_SECRET;
  if (!secret) throw new Error("FMS_SHARED_SECRET is not set.");
  return secret;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = req.nextUrl.searchParams.get("limit") ?? "20";

  const url = new URL(`${baseUrl()}/api/integrations/work-orders`);
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("limit", limit);

  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${sharedSecret()}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: typeof body?.error === "string" ? body.error : `FMS returned ${res.status}` },
      { status: res.status },
    );
  }

  const body = await res.json();
  return NextResponse.json(body);
}
