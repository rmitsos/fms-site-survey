// PIN hashing + session-token helpers, mirroring FMS's own lib/auth.ts. Uses Node's built-in
// crypto (scrypt) rather than bringing in bcrypt/argon2 - one less dependency for a low-QPS tool,
// and scrypt with a random per-user salt plus a lockout policy is a reasonable trade for a short
// numeric PIN meant to be fast to type on a phone, not a full password.

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { SESSION_COOKIE_NAME } from "./authConstants";

export * from "./authConstants";

const SCRYPT_KEYLEN = 64;

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export type ResolvedUser = { id: number; email: string; fullName: string; isAdmin: boolean; active: boolean };

/** Resolves the signed-in user from the session cookie - null if there isn't one, it's expired,
 * or the account was deactivated after the session was created. */
export async function resolveUser(): Promise<ResolvedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const db = getDb();
  const session = await db.query.sessions.findFirst({ where: eq(sessions.id, token) });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user || !user.active) return null;

  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
  return { id: user.id, email: user.email, fullName: user.fullName, isAdmin: user.isAdmin, active: user.active };
}
