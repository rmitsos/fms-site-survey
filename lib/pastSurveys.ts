import { and, desc, eq, ne, ilike } from "drizzle-orm";
import { getDb } from "@/db";
import { surveyReports, surveySessions } from "@/db/schema";
import type { PastSurveyContext } from "./routeProposal";

const MAX_PAST_SURVEYS = 3;

/** Retrieves past-survey context for the LLM prompt: prior route-proposal summaries from other
 * completed sessions, preferring ones with a similar site name and falling back to the most
 * recent otherwise. Plain SQL retrieval, not a similarity model - the LLM judges relevance. */
export async function getPastSurveyContext(currentSessionId: number, siteName: string): Promise<PastSurveyContext[]> {
  const db = getDb();
  const query = () => db
    .select({ siteName: surveySessions.siteName, summary: surveyReports.summary })
    .from(surveyReports)
    .innerJoin(surveySessions, eq(surveyReports.sessionId, surveySessions.id))
    .orderBy(desc(surveyReports.generatedAt))
    .limit(MAX_PAST_SURVEYS);

  const firstWord = siteName.trim().split(/\s+/)[0];
  const similar = await query().where(and(
    ne(surveySessions.id, currentSessionId),
    eq(surveySessions.status, "completed"),
    ilike(surveySessions.siteName, `%${firstWord}%`),
  ));
  if (similar.length > 0) return similar;

  return query().where(and(
    ne(surveySessions.id, currentSessionId),
    eq(surveySessions.status, "completed"),
  ));
}
