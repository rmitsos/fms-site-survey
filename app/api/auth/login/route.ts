import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  hashPin, verifyPin, generateSessionToken,
  SESSION_COOKIE_NAME, SESSION_DURATION_MS, MAX_FAILED_PIN_ATTEMPTS, LOCKOUT_DURATION_MS, PIN_MIN_LENGTH, PIN_MAX_LENGTH,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: unknown; pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  if (!email || !pin) return NextResponse.json({ error: "Email and PIN are required." }, { status: 400 });
  if (!/^\d+$/.test(pin) || pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) {
    return NextResponse.json({ error: `PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits.` }, { status: 400 });
  }

  const db = getDb();
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });

  // Same generic message whether the email doesn't exist or the PIN is wrong - don't let a
  // login attempt reveal which emails have accounts.
  const invalid = () => NextResponse.json({ error: "Invalid email or PIN." }, { status: 401 });

  if (!user) {
    // Bootstrap: on a completely empty install, the first login attempt becomes the first
    // admin (whatever PIN is typed sets it, via the same first-time path below).
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
    if (Number(count) === 0) {
      [user] = await db.insert(users).values({ email, fullName: "Administrator", isAdmin: true }).returning();
    }
  }
  if (!user || !user.active) return invalid();

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return NextResponse.json({ error: "Too many failed attempts - try again in a few minutes." }, { status: 429 });
  }

  let firstTimeSetup = false;
  if (!user.pinHash) {
    // No PIN configured yet (brand-new user, or an admin-triggered reset) - whatever is typed
    // now becomes this user's real PIN.
    firstTimeSetup = true;
    await db.update(users).set({ pinHash: hashPin(pin), failedPinAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
  } else if (!verifyPin(pin, user.pinHash)) {
    const attempts = user.failedPinAttempts + 1;
    const lockingNow = attempts >= MAX_FAILED_PIN_ATTEMPTS;
    await db.update(users).set({
      failedPinAttempts: lockingNow ? 0 : attempts,
      lockedUntil: lockingNow ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
    }).where(eq(users.id, user.id));
    return lockingNow
      ? NextResponse.json({ error: "Too many failed attempts - try again in a few minutes." }, { status: 429 })
      : invalid();
  } else {
    await db.update(users).set({ failedPinAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
  }

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessions).values({ id: token, userId: user.id, expiresAt });
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));

  const cookieStore = await cookies();
  // secure:true is dropped silently by browsers on plain http:// (e.g. local dev) - only
  // require it once this is actually served over https.
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return NextResponse.json({ ok: true, firstTimeSetup, user: { id: user.id, email: user.email, fullName: user.fullName, isAdmin: user.isAdmin } });
}
