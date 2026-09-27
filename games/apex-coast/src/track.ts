import { CatmullRomCurve3, Vector3 } from 'three';

export const TRACK_WIDTH = 13;
export const TRACK_SAMPLES = 600;
export const trackCurve = new CatmullRomCurve3(
  [
    [0, 230],
    [5, 155],
    [45, 95],
    [130, 75],
    [200, 5],
    [178, -105],
    [110, -185],
    [0, -220],
    [-125, -205],
    [-208, -140],
    [-224, -45],
    [-196, 45],
    [-145, 108],
    [-116, 181],
    [-70, 229],
  ].map(([x, z]) => new Vector3(x, 0, z)),
  true,
  'catmullrom',
  0.35,
);
export const trackLength = trackCurve.getLength();
export const trackPoints = Array.from({ length: TRACK_SAMPLES }, (_, i) =>
  trackCurve.getPointAt(i / TRACK_SAMPLES),
);
export function trackPose(progress: number) {
  const t = ((progress % 1) + 1) % 1;
  const position = trackCurve.getPointAt(t);
  const tangent = trackCurve.getTangentAt(t).normalize();
  return {
    position,
    tangent,
    right: new Vector3(-tangent.z, 0, tangent.x),
    yaw: Math.atan2(-tangent.x, -tangent.z),
  };
}
export function nearestTrack(x: number, z: number) {
  let nearest = 0,
    distanceSq = Infinity;
  for (let i = 0; i < trackPoints.length; i++) {
    const point = trackPoints[i];
    const d = (point.x - x) ** 2 + (point.z - z) ** 2;
    if (d < distanceSq) {
      distanceSq = d;
      nearest = i;
    }
  }
  return {
    progress: nearest / TRACK_SAMPLES,
    distance: Math.sqrt(distanceSq),
    index: nearest,
  };
}
export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '—:——.———';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;
}
