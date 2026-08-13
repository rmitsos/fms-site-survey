# fms-site-survey

Companion app to FMS for capturing field site surveys (GPS/sensor-estimated waypoints with
manual correction and photos) and proposing cable/equipment routes via LLM, using past surveys
and design rules as context. Writes estimates back into FMS via a shared-secret endpoint
(`work_orders.survey_estimate`).

Next.js + Drizzle, same shape as `fms-license-authority`.

## Dev

```
npm install
npm run db:generate   # after schema.ts changes
npm run dev
```

Env vars: see `.env.example`.

## Authentication

One shared password (`SURVEY_APP_PASSWORD`), not per-user accounts - anyone
with access to FMS is meant to have access to this tool too, so there's
nothing to separately provision per surveyor (`lib/auth.ts`). Session is a
signed, expiring cookie (`SESSION_SECRET`), no server-side session store. All
of `/sessions` and the survey-sessions/waypoints/design-rules APIs require a
signed-in session; `createdBy` on a session is a free-text field again since
there's no authenticated identity to source it from.

A real link between FMS's own auth and this app's is still to be figured
out - this is a deliberate placeholder until then.

## FMS integration

A survey session links to an FMS work order via `fmsWorkOrderId` (FMS's
`customer_work_id`) and holds its budget numbers in `surveyEstimate`
(`lib/jobParameters.ts`, mirroring FMS's `JobParameters`). `POST
/api/survey-sessions/:id/push-estimate` sends that estimate to FMS's
`work_orders.survey_estimate` via `lib/fmsClient.ts`, authenticated with
`FMS_SHARED_SECRET` against FMS's `SURVEY_APP_SHARED_SECRET` (same value,
different env var name on each side) at `FMS_BASE_URL`.

## Route proposals (LLM)

`POST /api/survey-sessions/:id/reports` asks Claude (`claude-opus-5`, structured
JSON output - `lib/routeProposal.ts`) to propose a cable route connecting a
session's waypoints, given that session's own waypoints/segments, the
`design_rules` library, and summaries from similar past completed surveys
(`lib/pastSurveys.ts` - plain SQL retrieval by site-name match falling back to
most recent, not a similarity model; the LLM does the judgment). Results are
stored in `survey_reports` and shown on the session page, where a report can
be marked approved/sent. Design rules are managed at `/sessions/design-rules`.
Requires `ANTHROPIC_API_KEY`.
