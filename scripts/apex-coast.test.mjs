import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as CANNON from 'cannon-es';
import { DrivingPhysics } from '../games/apex-coast/src/physics.ts';
import { VEHICLES } from '../games/apex-coast/src/vehicles.ts';
import { RaceState } from '../games/apex-coast/src/race.ts';
import { parseSave } from '../games/apex-coast/src/save.ts';
import {
  nearestTrack,
  trackLength,
  trackPose,
} from '../games/apex-coast/src/track.ts';

const idle = { throttle: 0, brake: 0, steer: 0, handbrake: false };
function step(physics, seconds, input = idle) {
  for (let i = 0; i < seconds * 120; i++) physics.update(input, 1 / 120);
}
test('all cars settle on four suspension contacts without entering reverse while held for countdown', () => {
  for (const spec of VEHICLES) {
    const p = new DrivingPhysics(spec);
    step(p, 3, { ...idle, brake: 1, allowReverse: false });
    assert.equal(p.reverse, false);
    assert.equal(p.vehicle.numWheelsOnGround, 4);
    assert.ok(p.body.position.y > spec.radius);
    assert.ok(p.body.position.y < spec.radius + spec.suspension + 0.1);
    assert.ok(
      p.body.position.distanceTo(new CANNON.Vec3(0, p.body.position.y, 230)) <
        0.25,
    );
  }
});
test('drivetrain forces accelerate different vehicle masses, braking stops, and held brake reverses', () => {
  const speeds = [];
  for (const spec of VEHICLES) {
    const p = new DrivingPhysics(spec);
    step(p, 1);
    step(p, 2.5, { ...idle, throttle: 1 });
    speeds.push(p.signedSpeed);
    assert.ok(p.signedSpeed > 8);
    step(p, 2, { ...idle, brake: 1, allowReverse: false });
    assert.ok(p.speed < 0.5);
    step(p, 2.5, { ...idle, brake: 1 });
    assert.equal(p.reverse, true);
    assert.ok(p.signedSpeed < -3);
  }
  assert.ok(
    speeds[0] > speeds[2] + 2,
    'GT accelerates more quickly than the heavier truck',
  );
  assert.ok(
    speeds[1] > speeds[2] + 2,
    'AWD rally accelerates more quickly than the heavier truck',
  );
});
test('a physical barrier prevents driving through its collision shape', () => {
  const p = new DrivingPhysics(VEHICLES[0]);
  const pose = trackPose(0);
  p.addBarrier(
    pose.position.x + pose.tangent.x * 14,
    pose.position.z + pose.tangent.z * 14,
    22,
    pose.yaw + Math.PI / 2,
  );
  let furthest = 0;
  for (let i = 0; i < 720; i++) {
    p.update({ ...idle, throttle: 1 }, 1 / 120);
    furthest = Math.max(
      furthest,
      (p.body.position.x - pose.position.x) * pose.tangent.x +
        (p.body.position.z - pose.position.z) * pose.tangent.z,
    );
  }
  assert.ok(furthest < 13);
  assert.ok(furthest > 10);
  assert.ok(p.speed < 1);
});
test('every vehicle can physically complete a valid three-lap race using only steering and pedals', () => {
  for (const spec of VEHICLES) {
    const p = new DrivingPhysics(spec);
    const race = new RaceState('time-trial');
    p.reset(0.003);
    race.previousProgress = 0.003;
    step(p, 1, { ...idle, brake: 1, allowReverse: false });
    let maxDistance = 0;
    for (let i = 0; i < 120 * 330 && !race.finished; i++) {
      const n = nearestTrack(p.body.position.x, p.body.position.z);
      maxDistance = Math.max(maxDistance, n.distance);
      const ahead = trackPose(
        n.progress + (7 + p.speed * 0.5) / trackLength,
      ).position;
      const f = p.body.quaternion.vmult(new CANNON.Vec3(0, 0, -1));
      let error =
        Math.atan2(
          -(ahead.x - p.body.position.x),
          -(ahead.z - p.body.position.z),
        ) - Math.atan2(-f.x, -f.z);
      error = Math.atan2(Math.sin(error), Math.cos(error));
      const lock = spec.steering / (1 + p.speed * 0.045);
      const steer = Math.max(-1, Math.min(1, (error * 1.7) / lock));
      const target = 15 - Math.min(6, Math.abs(error) * 10);
      p.update(
        {
          ...idle,
          throttle: p.speed < target ? 0.65 : 0,
          brake: p.speed > target + 2 ? 0.2 : 0,
          steer,
        },
        1 / 120,
      );
      race.update(1 / 120, n.progress, n.distance < 8);
    }
    assert.equal(race.finished, true, spec.id);
    assert.equal(race.times.length, 3);
    assert.ok(race.times.every((t) => Number.isFinite(t) && t > 50));
    assert.ok(maxDistance < 6.5);
  }
});
test('reverse driving, skipping gates, and recovering cannot create valid lap records', () => {
  const backwards = new RaceState('time-trial');
  for (let i = 1; i < 601; i++)
    backwards.update(1 / 60, (1 - i / 600) % 1, true);
  assert.equal(backwards.lap, 1);
  const shortcut = new RaceState('time-trial');
  shortcut.update(0.1, 0.5, true);
  shortcut.update(0.1, 0.98, true);
  shortcut.update(0.1, 0.001, true);
  assert.equal(shortcut.lap, 1);
  assert.equal(shortcut.valid, false);
  const recovered = new RaceState('practice');
  for (let i = 1; i < 601; i++) {
    if (i === 200) recovered.resetLap((i - 1) / 600);
    recovered.update(1 / 60, (i % 600) / 600, true);
  }
  assert.equal(recovered.lap, 2);
  assert.equal(recovered.times[0], Infinity);
  assert.equal(recovered.finished, false);
});
test('save parsing tolerates corruption and rejects impossible values', () => {
  assert.equal(parseSave('not json').vehicle, 0);
  assert.deepEqual(parseSave('{"version":99}').bests, {});
  const saved = parseSave(
    JSON.stringify({
      version: 1,
      vehicle: 2,
      color: 4,
      assists: false,
      quality: 'low',
      units: 'kmh',
      volume: 999,
      bests: {
        'summit-unassisted': 90,
        'vantage-assisted': -1,
        'other-game': 3,
      },
    }),
  );
  assert.equal(saved.vehicle, 2);
  assert.equal(saved.volume, 100);
  assert.deepEqual(saved.bests, { 'summit-unassisted': 90 });
  assert.equal(saved.assists, false);
});
