// Single shared password, not a per-user account system - anyone who has access to FMS is meant
// to have access to this tool too, so there's nothing to separately provision per surveyor.
// (A real link between the two apps' auth is still to be figured out - see the FMS integration
// section of the README.) Session is a signed, expiring cookie (HMAC over an expiry timestamp)
// rather than a server-side session store, so there's nothing extra to run.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "survey_session";
const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set.");
  return s;
}

function signValue(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function checkPassword(password: string): boolean {
  const expected = process.env.SURVEY_APP_PASSWORD;
  if (!expected) throw new Error("SURVEY_APP_PASSWORD is not set.");
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createSession(): Promise<void> {
  const expiresAt = Date.now() + SESSION_DAYS * 86_400_000;
  const value = String(expiresAt);
  const token = `${value}.${signValue(value)}`;
  const store = await cookies();
  // secure:true is dropped silently by browsers on plain http:// (e.g. local dev) - only
  // require it once this is actually served over https.
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [value, signature] = token.split(".");
  if (!value || !signature) return false;
  const expected = signValue(value);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(value) > Date.now();
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
