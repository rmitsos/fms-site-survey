import type { JobParameters } from "./jobParameters";

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

/** Pushes a finished survey's estimate into FMS's work_orders.survey_estimate, via the
 * shared-secret endpoint FMS exposes for this app (POST /api/integrations/survey-estimate).
 * Throws on any non-2xx response - the caller decides how to surface/retry the failure. */
export async function pushSurveyEstimate(customerWorkId: string, surveyEstimate: JobParameters): Promise<void> {
  const res = await fetch(`${baseUrl()}/api/integrations/survey-estimate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${sharedSecret()}`,
    },
    body: JSON.stringify({ customerWorkId, surveyEstimate }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = typeof body?.error === "string" ? body.error : `FMS returned ${res.status}`;
    throw new Error(message);
  }
}
