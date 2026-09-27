import { nearestTrack } from './track.ts';
export const TERRAIN_STEP = 8;
export const TERRAIN_CELLS = 150;
export const TERRAIN_X = -380;
export const TERRAIN_Z = 600;
function elevation(x: number, z: number) {
  const distance = nearestTrack(x, z).distance;
  const blend = Math.min(1, Math.max(0, (distance - 22) / 44));
  const rolling =
    5 +
    4 * Math.sin(x * 0.02 + z * 0.006) +
    3 * Math.sin(z * 0.027 - x * 0.012) +
    2 * Math.sin(x * 0.047 + z * 0.039);
  return Math.max(0, rolling) * blend * blend * (3 - 2 * blend);
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
  return (
    terrainData[ix][iz] * (1 - tx) * (1 - tz) +
    terrainData[ix + 1][iz] * tx * (1 - tz) +
    terrainData[ix][iz + 1] * (1 - tx) * tz +
    terrainData[ix + 1][iz + 1] * tx * tz
  );
}
