"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateSessionForm() {
  const router = useRouter();
  const [siteName, setSiteName] = useState("");
  const [fmsWorkOrderId, setFmsWorkOrderId] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/survey-sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteName, fmsWorkOrderId, createdBy }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not create the session.");
        return;
      }
      router.push(`/sessions/${body.session.id}`);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panel">
      <form onSubmit={handleSubmit} className="inline-form">
        <label><span>Site name</span><input value={siteName} onChange={(e) => setSiteName(e.target.value)} required /></label>
        <label><span>FMS work order</span><input value={fmsWorkOrderId} onChange={(e) => setFmsWorkOrderId(e.target.value)} placeholder="customer_work_id" /></label>
        <label><span>Surveyor</span><input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} /></label>
        <button type="submit" disabled={pending}>{pending ? "Starting…" : "Start session"}</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
