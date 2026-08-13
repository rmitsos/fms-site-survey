import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionDetail } from "@/lib/sessionDetail";
import CaptureClient from "./CaptureClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) notFound();

  const detail = await getSessionDetail(sessionId);
  if (!detail) notFound();

  return (
    <main className="admin-shell">
      <div className="admin-nav">
        <span className="admin-nav-title">FMS Site Survey</span>
        <Link href="/sessions">All sessions</Link>
      </div>
      <div className="admin-content">
        <CaptureClient initialSession={detail.session} initialWaypoints={detail.waypoints} initialSegments={detail.segments} />
      </div>
    </main>
  );
}
