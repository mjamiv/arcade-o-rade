import { trackLength, trackPose, curvatureAt, TRACK_WIDTH } from './track.ts';
import { terrainHeight } from './terrain.ts';

export interface TrackObstacle {
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
  yaw: number;
  pitch: number;
}
export const rails: TrackObstacle[] = [];
export const kerbs: TrackObstacle[] = [];
const count = Math.ceil(trackLength / 3);
for (let i = 0; i < count; i++) {
  const t = i / count,
    pose = trackPose(t);
  for (const side of [-1, 1]) {
    // Corner kerbs only: no red/white stripes down the main straight.
    if (Math.abs(curvatureAt(t)) > 0.009) {
      const p = pose.position
        .clone()
        .addScaledVector(pose.right, side * (TRACK_WIDTH / 2 + 0.4));
      kerbs.push({
        x: p.x,
        z: p.z,
        y: terrainHeight(p.x, p.z) + 0.035,
        length: trackLength / count + 0.06,
        width: 0.8,
        height: 0.07,
        yaw: pose.yaw,
        pitch: pose.pitch,
      });
    }
    if (i % 3 !== 0 || t < 0.08 || t > 0.98) continue;
    const p = pose.position
      .clone()
      .addScaledVector(pose.right, side * (TRACK_WIDTH / 2 + 9));
    rails.push({
      x: p.x,
      z: p.z,
      y: terrainHeight(p.x, p.z) + 0.6,
      length: (trackLength / count) * 3 + 0.15,
      width: 0.2,
      height: 1.2,
      yaw: pose.yaw,
      pitch: pose.pitch,
    });
  }
}
// Concrete pit wall: leaves entry/exit openings, with a separate paddock lane.
export const pitWall: TrackObstacle = {
  x: 11.3,
  y: 0.55,
  z: 183,
  length: 94,
  width: 0.45,
  height: 1.1,
  yaw: 0,
  pitch: 0,
};
