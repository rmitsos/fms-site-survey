import { notFound } from "next/navigation";
import { getSessionDetail } from "@/lib/sessionDetail";
import CaptureClient from "./CaptureClient";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) notFound();

  const detail = await getSessionDetail(sessionId);
  if (!detail) notFound();

  return (
    <CaptureClient
      initialSession={detail.session}
      initialWaypoints={detail.waypoints}
      initialSegments={detail.segments}
      initialReports={detail.reports}
    />
  );
}
