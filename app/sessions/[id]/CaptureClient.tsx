"use client";

import { useMemo, useRef, useState } from "react";
import { useMotionTracker } from "@/lib/useMotionTracker";
import { offsetLatLng } from "@/lib/geo";
import { effectivePosition } from "@/lib/waypoints";
import type { surveySessions, waypoints, segments, surveyReports } from "@/db/schema";
import SurveyEstimateForm from "./SurveyEstimateForm";
import ReportsPanel from "./ReportsPanel";

type SessionRecord = typeof surveySessions.$inferSelect;
type WaypointRecord = typeof waypoints.$inferSelect;
type SegmentRecord = typeof segments.$inferSelect;
type ReportRecord = typeof surveyReports.$inferSelect;

export default function CaptureClient({
  initialSession,
  initialWaypoints,
  initialSegments,
  initialReports,
}: {
  initialSession: SessionRecord;
  initialWaypoints: WaypointRecord[];
  initialSegments: SegmentRecord[];
  initialReports: ReportRecord[];
}) {
  const [session, setSession] = useState(initialSession);
  const [waypointList, setWaypointList] = useState(initialWaypoints);
  const [segmentList, setSegmentList] = useState(initialSegments);

  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [gpsFix, setGpsFix] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [gpsBusy, setGpsBusy] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const motion = useMotionTracker();

  const segmentByFromId = useMemo(() => {
    const map = new Map<number, SegmentRecord>();
    for (const s of segmentList) map.set(s.fromWaypointId, s);
    return map;
  }, [segmentList]);

  const lastWaypoint = waypointList[waypointList.length - 1] ?? null;

  function getGpsFix() {
    setGpsError("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not available.");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsBusy(false);
      },
      (err) => {
        setGpsError(err.message || "Could not get a GPS fix.");
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function handleAddWaypoint(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    try {
      // Project the accumulated DeviceMotion distance/heading from the previous waypoint's
      // position into an absolute lat/lng, so it's stored the same way a GPS fix would be.
      let estimatedLat: number | null = null;
      let estimatedLng: number | null = null;
      if (motion.estimate.distanceMeters > 0 && motion.estimate.headingDegrees != null && lastWaypoint) {
        const prevPos = effectivePosition(lastWaypoint);
        if (prevPos) {
          const offset = offsetLatLng(prevPos.lat, prevPos.lng, motion.estimate.distanceMeters, motion.estimate.headingDegrees);
          estimatedLat = offset.lat;
          estimatedLng = offset.lng;
        }
      }

      const res = await fetch(`/api/survey-sessions/${session.id}/waypoints`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label,
          notes,
          gpsLat: gpsFix?.lat ?? null,
          gpsLng: gpsFix?.lng ?? null,
          estimatedLat,
          estimatedLng,
          manualLat: manualLat ? Number(manualLat) : null,
          manualLng: manualLng ? Number(manualLng) : null,
          motionDistanceMeters: motion.estimate.distanceMeters > 0 ? motion.estimate.distanceMeters : null,
          motionHeadingDegrees: motion.estimate.headingDegrees,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAddError(body.error ?? "Could not add the waypoint.");
        return;
      }

      setWaypointList((prev) => [...prev, body.waypoint]);
      if (body.segment) setSegmentList((prev) => [...prev, body.segment]);
      if (session.status === "draft") setSession((prev) => ({ ...prev, status: "in_progress" }));

      setLabel("");
      setNotes("");
      setGpsFix(null);
      setManualLat("");
      setManualLng("");
      motion.reset();
    } catch {
      setAddError("Could not reach the server.");
    } finally {
      setAdding(false);
    }
  }

  async function handleMotionToggle() {
    if (motion.tracking) {
      motion.stop();
      return;
    }
    await motion.start();
  }

  async function handleWaypointCorrection(waypointId: number, lat: string, lng: string) {
    const res = await fetch(`/api/waypoints/${waypointId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ manualLat: lat ? Number(lat) : null, manualLng: lng ? Number(lng) : null }),
    });
    const body = await res.json();
    if (res.ok) {
      setWaypointList((prev) => prev.map((w) => (w.id === waypointId ? body.waypoint : w)));
      // A manual correction can recompute both neighboring segments server-side - refetch them
      // rather than reimplementing that precedence logic on the client.
      const detailRes = await fetch(`/api/survey-sessions/${session.id}`);
      if (detailRes.ok) {
        const detail = await detailRes.json();
        setSegmentList(detail.segments);
      }
    }
    return body;
  }

  async function handlePhotoUpload(waypointId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/waypoints/${waypointId}/photo`, { method: "POST", body: formData });
    const body = await res.json();
    if (res.ok) setWaypointList((prev) => prev.map((w) => (w.id === waypointId ? body.waypoint : w)));
    return body;
  }

  async function handleMarkComplete() {
    const res = await fetch(`/api/survey-sessions/${session.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    const body = await res.json();
    if (res.ok) setSession(body.session);
  }

  return (
    <>
      <div className="session-header">
        <div>
          <h1>{session.siteName}</h1>
          <div className="session-meta">
            <span className={`status-pill status-${session.status}`}>{session.status.replace("_", " ")}</span>
            {session.fmsWorkOrderId ? <span>Work order <code>{session.fmsWorkOrderId}</code></span> : null}
            <span>Started {new Date(session.startedAt).toLocaleString()}</span>
          </div>
        </div>
        {session.status !== "completed" ? (
          <button type="button" className="btn btn-secondary" onClick={handleMarkComplete}>Mark complete</button>
        ) : null}
      </div>

      <div className="panel">
        <h2>Add waypoint</h2>
        <div className="capture-controls">
          <button type="button" className="btn btn-secondary" onClick={getGpsFix} disabled={gpsBusy}>
            {gpsBusy ? "Getting GPS…" : "Get GPS fix"}
          </button>
          {gpsFix ? (
            <span className="capture-reading">
              GPS: <strong>{gpsFix.lat.toFixed(6)}, {gpsFix.lng.toFixed(6)}</strong> (±{Math.round(gpsFix.accuracy)}m)
            </span>
          ) : null}
          {gpsError ? <span className="error">{gpsError}</span> : null}
        </div>
        <div className="capture-controls">
          <button type="button" className="btn btn-secondary" onClick={handleMotionToggle}>
            {motion.tracking ? "Stop motion tracking" : "Start motion tracking"}
          </button>
          <button type="button" className="text-button" onClick={motion.reset}>Reset</button>
          <span className="capture-reading">
            Motion estimate: <strong>{motion.estimate.distanceMeters.toFixed(1)}m</strong>
            {motion.estimate.headingDegrees != null ? ` @ ${Math.round(motion.estimate.headingDegrees)}°` : ""}
          </span>
          {motion.error ? <span className="error">{motion.error}</span> : null}
        </div>

        <form onSubmit={handleAddWaypoint} className="inline-form">
          <label><span>Label</span><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. BEP, riser" /></label>
          <label><span>Notes</span><input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <label><span>Manual lat</span><input value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="optional override" /></label>
          <label><span>Manual lng</span><input value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="optional override" /></label>
          <button type="submit" disabled={adding}>{adding ? "Adding…" : "Add waypoint"}</button>
        </form>
        {addError ? <p className="error">{addError}</p> : null}
      </div>

      <table className="data-table">
        <thead>
          <tr><th>#</th><th>Label</th><th>Position</th><th>To next</th><th>Photo</th></tr>
        </thead>
        <tbody>
          {waypointList.map((w) => (
            <WaypointRow
              key={w.id}
              waypoint={w}
              segment={segmentByFromId.get(w.id)}
              onCorrect={handleWaypointCorrection}
              onPhoto={handlePhotoUpload}
            />
          ))}
          {waypointList.length === 0 ? <tr><td colSpan={5} className="muted">No waypoints yet.</td></tr> : null}
        </tbody>
      </table>

      <SurveyEstimateForm session={session} onUpdated={(patch) => setSession((prev) => ({ ...prev, ...patch }))} />

      <ReportsPanel sessionId={session.id} waypointCount={waypointList.length} initialReports={initialReports} />
    </>
  );
}

function WaypointRow({
  waypoint,
  segment,
  onCorrect,
  onPhoto,
}: {
  waypoint: WaypointRecord;
  segment: SegmentRecord | undefined;
  onCorrect: (waypointId: number, lat: string, lng: string) => Promise<unknown>;
  onPhoto: (waypointId: number, file: File) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [lat, setLat] = useState(waypoint.manualLat != null ? String(waypoint.manualLat) : "");
  const [lng, setLng] = useState(waypoint.manualLng != null ? String(waypoint.manualLng) : "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pos = effectivePosition(waypoint);
  const source = waypoint.manualLat != null ? "manual" : waypoint.gpsLat != null ? "gps" : waypoint.estimatedLat != null ? "sensor" : null;

  async function save() {
    setSaving(true);
    try {
      await onCorrect(waypoint.id, lat, lng);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onPhoto(waypoint.id, file);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <tr>
      <td>{waypoint.sequence}</td>
      <td>{waypoint.label || <span className="muted">—</span>}</td>
      <td>
        {editing ? (
          <div className="inline-form inline-form-compact">
            <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="lat" />
            <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="lng" />
            <button type="button" className="btn btn-secondary" onClick={save} disabled={saving}>{saving ? "…" : "Save"}</button>
            <button type="button" className="text-button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        ) : (
          <>
            {pos ? <span>{pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}</span> : <span className="muted">No position</span>}
            {source ? <span className={`method-badge method-${source}`}> {source}</span> : null}{" "}
            <button type="button" className="text-button" onClick={() => setEditing(true)}>Correct</button>
          </>
        )}
      </td>
      <td>{segment?.distanceMeters != null ? `${segment.distanceMeters.toFixed(1)}m` : <span className="muted">—</span>}</td>
      <td>
        {waypoint.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Vercel Blob URL, no next/image domain config
          <img src={waypoint.photoUrl} alt="" className="waypoint-photo" />
        ) : (
          <div className="waypoint-photo-placeholder">none</div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFileChange} />
        <button type="button" className="text-button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : waypoint.photoUrl ? "Replace" : "Add photo"}
        </button>
      </td>
    </tr>
  );
}
