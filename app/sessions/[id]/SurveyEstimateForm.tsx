"use client";

import { useState } from "react";
import { JOB_PARAMETER_FIELDS, type JobParameters } from "@/lib/jobParameters";

export type EstimateSessionFields = {
  id: number;
  fmsWorkOrderId: string;
  surveyEstimate: JobParameters | null;
  estimatePushedAt: Date | null;
};

export default function SurveyEstimateForm({
  session,
  onUpdated,
}: {
  session: EstimateSessionFields;
  onUpdated: (patch: Partial<EstimateSessionFields>) => void;
}) {
  const [fmsWorkOrderId, setFmsWorkOrderId] = useState(session.fmsWorkOrderId);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const field of JOB_PARAMETER_FIELDS) {
      const value = session.surveyEstimate?.[field.key];
      if (value !== undefined) out[field.key] = String(value);
    }
    return out;
  });
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState("");
  const [pushedMessage, setPushedMessage] = useState("");

  function buildEstimate(): JobParameters {
    const out: Record<string, unknown> = {};
    for (const field of JOB_PARAMETER_FIELDS) {
      const raw = values[field.key];
      if (!raw) continue;
      out[field.key] = field.key === "floors" ? Number(raw) : raw;
    }
    return out as JobParameters;
  }

  async function saveEstimate(): Promise<boolean> {
    setError("");
    const res = await fetch(`/api/survey-sessions/${session.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fmsWorkOrderId, surveyEstimate: buildEstimate() }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Could not save the estimate.");
      return false;
    }
    onUpdated(body.session);
    return true;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPushedMessage("");
    setSaving(true);
    try {
      await saveEstimate();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePush() {
    setPushedMessage("");
    setPushing(true);
    try {
      // Save first so FMS gets whatever's currently in the form, not a stale save.
      if (!(await saveEstimate())) return;
      const res = await fetch(`/api/survey-sessions/${session.id}/push-estimate`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not push to FMS.");
        return;
      }
      setPushedMessage("Pushed to FMS.");
      onUpdated({ estimatePushedAt: new Date() });
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="panel">
      <h2>Survey estimate</h2>
      <p className="muted">Job parameters pushed to FMS as work_orders.survey_estimate for costing.</p>
      <form onSubmit={handleSave}>
        <div className="inline-form">
          <label><span>FMS work order</span><input value={fmsWorkOrderId} onChange={(e) => setFmsWorkOrderId(e.target.value)} placeholder="customer_work_id" /></label>
        </div>
        <div className="inline-form">
          {JOB_PARAMETER_FIELDS.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              {field.options ? (
                <select value={values[field.key] ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}>
                  <option value="">—</option>
                  {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input type="number" value={values[field.key] ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))} />
              )}
            </label>
          ))}
        </div>
        <div className="capture-controls">
          <button type="submit" className="btn btn-secondary" disabled={saving}>{saving ? "Saving…" : "Save estimate"}</button>
          <button type="button" className="btn" onClick={handlePush} disabled={pushing || !fmsWorkOrderId}>{pushing ? "Pushing…" : "Push to FMS"}</button>
          {session.estimatePushedAt ? <span className="muted">Last pushed {new Date(session.estimatePushedAt).toLocaleString()}</span> : null}
        </div>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {pushedMessage ? <p className="muted">{pushedMessage}</p> : null}
    </div>
  );
}
