// Split out from lib/auth.ts, which imports next/headers (server-only) - the login page needs
// these values but must stay a Client Component, and importing lib/auth.ts there would pull
// next/headers into the client bundle.

export const SESSION_COOKIE_NAME = "survey_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days - a surveyor's phone shouldn't need re-login constantly
export const MAX_FAILED_PIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;
