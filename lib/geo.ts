const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in meters between two lat/lng points (haversine). */
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial compass bearing in degrees (0-360) from point a to point b. */
export function bearingDegrees(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLng = toRad(bLng - aLng);
  const y = Math.sin(dLng) * Math.cos(toRad(bLat));
  const x = Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) - Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(dLng);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Offsets a lat/lng by a distance (meters) and heading (degrees) - used to project a
 * DeviceMotion-estimated displacement from the previous waypoint into a lat/lng when no GPS fix
 * is available (indoors). Flat-earth approximation, fine at the scale of a single building. */
export function offsetLatLng(lat: number, lng: number, meters: number, headingDeg: number): { lat: number; lng: number } {
  const heading = toRad(headingDeg);
  const dLat = ((meters * Math.cos(heading)) / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = ((meters * Math.sin(heading)) / (EARTH_RADIUS_M * Math.cos(toRad(lat)))) * (180 / Math.PI);
  return { lat: lat + dLat, lng: lng + dLng };
}
