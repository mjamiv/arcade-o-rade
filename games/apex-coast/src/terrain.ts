import { nearestTrack } from './track.ts';
export const TERRAIN_STEP = 4;
export const TERRAIN_CELLS = 300;
export const TERRAIN_X = -380;
export const TERRAIN_Z = 600;
function elevation(x: number, z: number) {
  const near = nearestTrack(x, z);
  const blend = Math.min(1, Math.max(0, (near.distance - 15) / 55));
  const rolling = Math.max(
    0,
    5 +
      4 * Math.sin(x * 0.02 + z * 0.006) +
      3 * Math.sin(z * 0.027 - x * 0.012) +
      2 * Math.sin(x * 0.047 + z * 0.039),
  );
  const t = blend * blend * (3 - 2 * blend);
  // The driveable corridor follows the same graded elevation as the circuit.
  const base = Math.max(0, near.height) * (1 - t) + rolling * t;
  const pitBlend = Math.min(
    1,
    Math.max(0, 10 - x, x - 42, 110 - z, z - 255) / 10,
  );
  return base * pitBlend * pitBlend * (3 - 2 * pitBlend);
}
export const terrainData = Array.from({ length: TERRAIN_CELLS + 1 }, (_, i) =>
  Array.from({ length: TERRAIN_CELLS + 1 }, (_, j) =>
    elevation(TERRAIN_X + i * TERRAIN_STEP, TERRAIN_Z - j * TERRAIN_STEP),
  ),
);
export function terrainHeight(x: number, z: number) {
  const gx = (x - TERRAIN_X) / TERRAIN_STEP,
    gz = (TERRAIN_Z - z) / TERRAIN_STEP;
  const ix = Math.floor(gx),
    iz = Math.floor(gz);
  if (ix < 0 || iz < 0 || ix >= TERRAIN_CELLS || iz >= TERRAIN_CELLS) return 0;
  const tx = gx - ix,
    tz = gz - iz;
  const a = terrainData[ix][iz],
    b = terrainData[ix + 1][iz],
    c = terrainData[ix][iz + 1],
    d = terrainData[ix + 1][iz + 1];
  // Match Cannon Heightfield's triangle diagonal exactly, rather than bilinear
  // interpolation (which can put rendered road above/below the wheel contact).
  return tx + tz <= 1
    ? a + tx * (b - a) + tz * (c - a)
    : d + (1 - tx) * (c - d) + (1 - tz) * (b - d);
}
