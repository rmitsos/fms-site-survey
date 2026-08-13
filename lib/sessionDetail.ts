import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { segments, surveySessions, waypoints } from "@/db/schema";

/** Shared by the session detail page (SSR) and its API route, so the two never drift. */
export async function getSessionDetail(sessionId: number) {
  const db = getDb();
  const session = await db.query.surveySessions.findFirst({ where: eq(surveySessions.id, sessionId) });
  if (!session) return null;

  const [sessionWaypoints, sessionSegments] = await Promise.all([
    db.select().from(waypoints).where(eq(waypoints.sessionId, sessionId)).orderBy(asc(waypoints.sequence)),
    db.select().from(segments).where(eq(segments.sessionId, sessionId)),
  ]);

  return { session, waypoints: sessionWaypoints, segments: sessionSegments };
}
