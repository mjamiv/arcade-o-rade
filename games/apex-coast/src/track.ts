import { CatmullRomCurve3, Vector3 } from 'three';

// New records are namespaced: the old flat course's records remain in the save.
export const TRACK_ID = 'club-v1';
export const TRACK_WIDTH = 12;
export const TRACK_SAMPLES = 800;
export const trackCurve = new CatmullRomCurve3(
  [
    [0, 0, 230],
    [0, 0, 100],
    [0, 1, 20],
    [25, 2, -15],
    [110, 5, -25],
    [175, 11, -80],
    [185, 18, -150],
    [145, 22, -205],
    [75, 24, -190],
    [45, 22, -125],
    [-5, 19, -105],
    [-65, 16, -155],
    [-140, 12, -235],
    [-230, 9, -205],
    [-265, 6, -120],
    [-235, 4, -55],
    [-265, 3, 10],
    [-250, 2, 80],
    [-200, 0, 120],
    [-115, 0, 125],
    [-75, 0, 170],
    [-75, 0, 235],
    [-40, 0, 270],
    [0, 0, 265],
  ].map(([x, y, z]) => new Vector3(x, y, z)),
  true,
  'centripetal',
);
trackCurve.arcLengthDivisions = 3200;
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
    right: new Vector3(-tangent.z, 0, tangent.x).normalize(),
    yaw: Math.atan2(-tangent.x, -tangent.z),
    pitch: Math.asin(tangent.y),
  };
}
export function nearestTrack(x: number, z: number) {
  let nearest = 0,
    fraction = 0,
    distanceSq = Infinity;
  // Project onto segments, not discrete points: smooth progress and road edges.
  for (let i = 0; i < trackPoints.length; i++) {
    const a = trackPoints[i],
      b = trackPoints[(i + 1) % TRACK_SAMPLES];
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const t = Math.max(
      0,
      Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)),
    );
    const d = (a.x + dx * t - x) ** 2 + (a.z + dz * t - z) ** 2;
    if (d < distanceSq) {
      distanceSq = d;
      nearest = i;
      fraction = t;
    }
  }
  const a = trackPoints[nearest],
    b = trackPoints[(nearest + 1) % TRACK_SAMPLES];
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  return {
    progress: ((nearest + fraction) / TRACK_SAMPLES) % 1,
    distance: Math.sqrt(distanceSq),
    index: nearest,
    height: a.y + (b.y - a.y) * fraction,
    lateral: ((x - a.x) * -(b.z - a.z) + (z - a.z) * (b.x - a.x)) / length,
  };
}
export function curvatureAt(progress: number) {
  const before = trackPose(progress - 8 / trackLength).tangent;
  const after = trackPose(progress + 8 / trackLength).tangent;
  return (
    Math.atan2(
      before.x * after.z - before.z * after.x,
      before.x * after.x + before.z * after.z,
    ) / 16
  );
}
export type Surface = 'ASPHALT' | 'KERB' | 'RUNOFF' | 'GRASS' | 'PIT LANE';
export function surfaceAt(x: number, z: number): Surface {
  if (x >= 13 && x <= 29 && z >= 109 && z <= 253) return 'PIT LANE';
  const distance = nearestTrack(x, z).distance;
  return distance < TRACK_WIDTH / 2
    ? 'ASPHALT'
    : distance < TRACK_WIDTH / 2 + 0.9
      ? 'KERB'
      : distance < TRACK_WIDTH / 2 + 5
        ? 'RUNOFF'
        : 'GRASS';
}
// Real corner names, apex references and conservative dry-road advisory speeds.
// Speeds are guidance, not enforced limits or an auto-driving system.
export const corners = [
  ['QUARRY RIGHT', 25, -15, 17],
  ['RIDGE SWEEPER', 175, -80, 23],
  ['SUMMIT HAIRPIN', 145, -205, 15],
  ['THE DIP', 45, -125, 17],
  ['SADDLE RIGHT', -5, -105, 16],
  ['LIGHTHOUSE', -140, -235, 20],
  ['OCEAN BEND', -265, -120, 21],
  ['COASTAL ESSES', -235, -55, 18],
  ['COVE LEFT', -265, 10, 19],
  ['CLUBHOUSE', -200, 120, 19],
  ['PADDOCK RIGHT', -115, 125, 17],
  ['LAST TURN', -40, 270, 14],
]
  .map(([name, x, z, speed]) => {
    const progress = nearestTrack(Number(x), Number(z)).progress;
    return {
      name: String(name),
      progress,
      speed: Number(speed),
      direction: curvatureAt(progress) > 0 ? 'RIGHT' : 'LEFT',
    };
  })
  .sort((a, b) => a.progress - b.progress);
export function upcomingCorner(progress: number) {
  let best = corners[0],
    distance = Infinity;
  for (const corner of corners) {
    const d = ((corner.progress - progress + 1) % 1) * trackLength;
    if (d < distance) {
      best = corner;
      distance = d;
    }
  }
  return { ...best, distance };
}
export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '—:——.———';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;
}
