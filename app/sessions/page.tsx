import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { surveySessions } from "@/db/schema";
import CreateSessionForm from "./CreateSessionForm";

export default async function SessionsPage() {
  const db = getDb();
  const sessions = await db.query.surveySessions.findMany({ orderBy: desc(surveySessions.startedAt) });

  return (
    <>
      <h1>Survey sessions</h1>
      <p className="muted">One session per site visit. Add waypoints as you walk the site, then push the resulting estimate to FMS.</p>
      <CreateSessionForm />
      <table className="data-table">
        <thead>
          <tr><th>Site</th><th>FMS work order</th><th>Status</th><th>Started</th></tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td><Link href={`/sessions/${s.id}`}>{s.siteName}</Link></td>
              <td>{s.fmsWorkOrderId ? <code>{s.fmsWorkOrderId}</code> : <span className="muted">—</span>}</td>
              <td><span className={`status-pill status-${s.status}`}>{s.status.replace("_", " ")}</span></td>
              <td>{s.startedAt.toISOString().slice(0, 10)}</td>
            </tr>
          ))}
          {sessions.length === 0 ? <tr><td colSpan={4} className="muted">No survey sessions yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
