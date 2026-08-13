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
