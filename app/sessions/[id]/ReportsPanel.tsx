"use client";

import { useState } from "react";
import type { surveyReports } from "@/db/schema";
import type { RouteProposal } from "@/lib/routeProposal";

type ReportRecord = typeof surveyReports.$inferSelect;

export default function ReportsPanel({
  sessionId,
  waypointCount,
  initialReports,
}: {
  sessionId: number;
  waypointCount: number;
  initialReports: ReportRecord[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setError("");
    setGenerating(true);
    try {
      const res = await fetch(`/api/survey-sessions/${sessionId}/reports`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not generate a route proposal.");
        return;
      }
      setReports((prev) => [body.report, ...prev]);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatusChange(reportId: number, status: string) {
    const res = await fetch(`/api/survey-reports/${reportId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await res.json();
    if (res.ok) setReports((prev) => prev.map((r) => (r.id === reportId ? body.report : r)));
  }

  return (
    <div className="panel">
      <h2>Route proposals</h2>
      <p className="muted">
        LLM-proposed cable routes for this session&apos;s waypoints, using design rules and similar past
        surveys as context.
      </p>
      <div className="capture-controls">
        <button type="button" className="btn" onClick={handleGenerate} disabled={generating || waypointCount < 2}>
          {generating ? "Generating…" : "Generate route proposal"}
        </button>
        {waypointCount < 2 ? <span className="muted">Add at least two waypoints first.</span> : null}
      </div>
      {error ? <p className="error">{error}</p> : null}

      {reports.map((report) => (
        <ReportCard key={report.id} report={report} onStatusChange={handleStatusChange} />
      ))}
      {reports.length === 0 ? <p className="muted">No proposals yet.</p> : null}
    </div>
  );
}

function ReportCard({
  report,
  onStatusChange,
}: {
  report: ReportRecord;
  onStatusChange: (reportId: number, status: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const proposal = report.proposedRoutes as RouteProposal;

  return (
    <div className="panel report-card">
      <div className="session-meta">
        <span className={`status-pill status-${report.status === "approved" ? "completed" : report.status === "sent" ? "completed" : "draft"}`}>
          {report.status}
        </span>
        <span>{new Date(report.generatedAt).toLocaleString()}</span>
      </div>
      <p>{report.summary}</p>
      <button type="button" className="text-button" onClick={() => setExpanded((v) => !v)}>
        {expanded ? "Hide details" : "Show details"}
      </button>
      {expanded && proposal?.segments ? (
        <table className="data-table">
          <thead>
            <tr><th>Segment</th><th>From</th><th>To</th><th>Method</th><th>Distance</th><th>Rationale</th></tr>
          </thead>
          <tbody>
            {proposal.segments.map((s, i) => (
              <tr key={i}>
                <td>{s.label}</td>
                <td>{s.fromWaypointLabel}</td>
                <td>{s.toWaypointLabel}</td>
                <td><span className="method-badge method-gps">{s.method.replace("_", " ")}</span></td>
                <td>{s.distanceMeters != null ? `${s.distanceMeters.toFixed(1)}m` : <span className="muted">—</span>}</td>
                <td>{s.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {expanded && proposal?.openQuestions?.length ? (
        <div className="reveal-box">
          <p><strong>Open questions</strong></p>
          {proposal.openQuestions.map((q, i) => <p key={i}>{q}</p>)}
        </div>
      ) : null}
      <div className="capture-controls">
        {report.status !== "approved" ? (
          <button type="button" className="btn btn-secondary" onClick={() => onStatusChange(report.id, "approved")}>Approve</button>
        ) : null}
        {report.status === "approved" ? (
          <button type="button" className="btn btn-secondary" onClick={() => onStatusChange(report.id, "sent")}>Mark sent</button>
        ) : null}
      </div>
    </div>
  );
}
