import { upcomingCorner, curvatureAt, trackLength } from './track.ts';

export function drivingAdvice(progress: number, speed: number, kind: string) {
  const corner = upcomingCorner(progress);
  let curvature = 0;
  for (const distance of [-20, -10, 0, 10, 20])
    curvature = Math.max(
      curvature,
      Math.abs(curvatureAt(corner.progress + distance / trackLength)),
    );
  const targetSpeed =
    Math.min(corner.speed, Math.sqrt(6.5 / Math.max(0.001, curvature))) *
    (kind === 'truck' ? 0.88 : 1);
  const brakingDistance =
    Math.max(0, (speed * speed - targetSpeed * targetSpeed) / (2 * 6.5)) +
    speed * 0.5 +
    12;
  const action =
    speed > targetSpeed + 1.5 && corner.distance < brakingDistance
      ? 'BRAKE'
      : corner.distance < 30
        ? 'TURN IN'
        : 'NEXT';
  return { corner, targetSpeed, brakingDistance, action };
}
