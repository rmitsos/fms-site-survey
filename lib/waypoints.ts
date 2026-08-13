import { bearingDegrees, distanceMeters } from "./geo";

export type WaypointPosition = {
  manualLat: number | null;
  manualLng: number | null;
  gpsLat: number | null;
  gpsLng: number | null;
  estimatedLat: number | null;
  estimatedLng: number | null;
};

/** A waypoint's best-known position: a manual correction always wins over a raw GPS fix, which
 * in turn wins over the DeviceMotion dead-reckoning estimate. */
export function effectivePosition(wp: WaypointPosition): { lat: number; lng: number } | null {
  if (wp.manualLat != null && wp.manualLng != null) return { lat: wp.manualLat, lng: wp.manualLng };
  if (wp.gpsLat != null && wp.gpsLng != null) return { lat: wp.gpsLat, lng: wp.gpsLng };
  if (wp.estimatedLat != null && wp.estimatedLng != null) return { lat: wp.estimatedLat, lng: wp.estimatedLng };
  return null;
}

export type SegmentGeometry = { distanceMeters: number | null; headingDegrees: number | null; method: "gps" | "manual" | "sensor" };

/** Recomputes a segment's distance/heading from its two endpoint waypoints. If both ends have an
 * authoritative fix (manual correction or GPS), that's used - and counts as "manual" if either
 * side is a manual correction, since a correction on just one end must still outrank that end's
 * stale GPS fix, not be silently discarded because the other end never got a matching one. Only
 * when at least one end has no fix at all do we fall back to a client-supplied DeviceMotion
 * distance, then to whatever position (possibly just the dead-reckoning estimate) is known. */
export function segmentGeometry(
  from: WaypointPosition,
  to: WaypointPosition,
  motion?: { distanceMeters?: number | null; headingDegrees?: number | null },
): SegmentGeometry {
  const fromManual = from.manualLat != null && from.manualLng != null;
  const toManual = to.manualLat != null && to.manualLng != null;
  const fromFixed = fromManual || (from.gpsLat != null && from.gpsLng != null);
  const toFixed = toManual || (to.gpsLat != null && to.gpsLng != null);

  if (fromFixed && toFixed) {
    const fromPos = effectivePosition(from)!;
    const toPos = effectivePosition(to)!;
    return {
      distanceMeters: distanceMeters(fromPos.lat, fromPos.lng, toPos.lat, toPos.lng),
      headingDegrees: bearingDegrees(fromPos.lat, fromPos.lng, toPos.lat, toPos.lng),
      method: fromManual || toManual ? "manual" : "gps",
    };
  }
  if (motion?.distanceMeters != null) {
    return { distanceMeters: motion.distanceMeters, headingDegrees: motion.headingDegrees ?? null, method: "sensor" };
  }
  const fromPos = effectivePosition(from);
  const toPos = effectivePosition(to);
  if (fromPos && toPos) {
    return {
      distanceMeters: distanceMeters(fromPos.lat, fromPos.lng, toPos.lat, toPos.lng),
      headingDegrees: bearingDegrees(fromPos.lat, fromPos.lng, toPos.lat, toPos.lng),
      method: "sensor",
    };
  }
  return { distanceMeters: null, headingDegrees: null, method: "sensor" };
}
