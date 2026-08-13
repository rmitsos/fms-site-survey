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

Email + PIN, mirroring FMS's own scheme (`lib/auth.ts`): on a completely empty
install, the first login attempt creates the first user as an admin and
whatever PIN is typed becomes their real PIN. An admin then registers each
surveyor by email (no PIN yet); that surveyor's first login sets their PIN
the same way. 5 failed attempts locks the account for 15 minutes. All of
`/sessions` and the survey-sessions/waypoints APIs require a signed-in user;
`createdBy` on a session comes from that session, not client input.

There's no admin UI yet for registering surveyors - insert directly into
`users` (email, full_name) and leave `pin_hash` empty.

## FMS integration

A survey session links to an FMS work order via `fmsWorkOrderId` (FMS's
`customer_work_id`) and holds its budget numbers in `surveyEstimate`
(`lib/jobParameters.ts`, mirroring FMS's `JobParameters`). `POST
/api/survey-sessions/:id/push-estimate` sends that estimate to FMS's
`work_orders.survey_estimate` via `lib/fmsClient.ts`, authenticated with
`FMS_SHARED_SECRET` against FMS's `SURVEY_APP_SHARED_SECRET` (same value,
different env var name on each side) at `FMS_BASE_URL`.
