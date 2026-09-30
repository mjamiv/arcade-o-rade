import * as CANNON from 'cannon-es';
import {
  terrainData,
  terrainHeight,
  TERRAIN_STEP,
  TERRAIN_X,
  TERRAIN_Z,
} from './terrain.ts';
import type { VehicleSpec } from './vehicles.ts';
import { nearestTrack, trackPose, surfaceAt, TRACK_WIDTH } from './track.ts';

import { rails, kerbs, pitWall } from './circuit.ts';
import type { TrackObstacle } from './circuit.ts';
import type { Surface } from './track.ts';

export interface DriveInput {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
  allowReverse?: boolean;
}
export class DrivingPhysics {
  world: CANNON.World;
  body: CANNON.Body;
  vehicle: CANNON.RaycastVehicle;
  spec: VehicleSpec;
  speed = 0;
  signedSpeed = 0;
  rpm = 950;
  gear = 1;
  steering = 0;
  onRoad = true;
  slip = 0;
  assists = true;
  reverse = false;
  surface: Surface = 'ASPHALT';
  wheelSurfaces: Surface[] = ['ASPHALT', 'ASPHALT', 'ASPHALT', 'ASPHALT'];
  throttle = 0;
  brake = 0;
  lateralG = 0;
  longitudinalG = 0;
  private obstacles: { body: CANNON.Body; active: boolean }[] = [];
  private collisionRefresh = 0;
  private shiftCooldown = 0;
  private reverseTimer = 0;
  constructor(spec: VehicleSpec) {
    this.spec = spec;
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = 10;
    this.world.defaultContactMaterial.friction = 0.3;
    this.world.defaultContactMaterial.restitution = 0.08;
    const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    ground.updateAABB();
    this.world.addBody(ground);
    const terrain = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Heightfield(terrainData, { elementSize: TERRAIN_STEP }),
      position: new CANNON.Vec3(TERRAIN_X, 0, TERRAIN_Z),
    });
    terrain.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    terrain.updateAABB();
    this.world.addBody(terrain);
    for (const obstacle of [...rails, ...kerbs, pitWall])
      this.addObstacle(obstacle);
    this.body = new CANNON.Body({
      mass: spec.mass,
      angularDamping: 0.2,
      linearDamping: 0.01,
    });
    this.body.addShape(
      new CANNON.Box(
        new CANNON.Vec3(
          spec.width * 0.46,
          spec.kind === 'truck' ? 0.43 : 0.28,
          spec.length * 0.45,
        ),
      ),
      new CANNON.Vec3(0, 0.25, 0),
    );
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.body,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });
    for (let i = 0; i < 4; i++) {
      this.vehicle.addWheel({
        radius: spec.radius,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        axleLocal: new CANNON.Vec3(-1, 0, 0),
        chassisConnectionPointLocal: new CANNON.Vec3(
          i % 2 === 0 ? -spec.track / 2 : spec.track / 2,
          0.08,
          i < 2 ? -spec.wheelbase / 2 : spec.wheelbase / 2,
        ),
        suspensionStiffness: spec.stiffness,
        suspensionRestLength: spec.suspension,
        dampingRelaxation: spec.damping,
        dampingCompression: spec.damping * 0.72,
        frictionSlip: spec.grip,
        rollInfluence: spec.kind === 'truck' ? 0.45 : 0.38,
        maxSuspensionForce: spec.mass * 12,
        maxSuspensionTravel: spec.suspension * 0.75,
        customSlidingRotationalSpeed: -30,
        useCustomSlidingRotationalSpeed: true,
      });
    }
    this.vehicle.addToWorld(this.world);
    this.reset(0);
  }
  addObstacle(obstacle: TrackObstacle) {
    const { x, y, z, width, height, length, yaw, pitch } = obstacle;
    const b = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, length / 2)),
      position: new CANNON.Vec3(x, y, z),
    });
    b.quaternion.setFromEuler(pitch, yaw, 0, 'YXZ');
    b.updateAABB();
    this.obstacles.push({ body: b, active: false });
  }
  private refreshCollisions() {
    // Only nearby static barriers/kerbs participate in raycasts. At a 0.2s refresh,
    // the 80m radius comfortably exceeds any vehicle's travel between updates.
    for (const obstacle of this.obstacles) {
      const p = obstacle.body.position;
      const active =
        Math.hypot(p.x - this.body.position.x, p.z - this.body.position.z) <
        80 + obstacle.body.boundingRadius;
      if (active === obstacle.active) continue;
      if (active) this.world.addBody(obstacle.body);
      else this.world.removeBody(obstacle.body);
      obstacle.active = active;
    }
    this.collisionRefresh = 0.2;
  }
  addBarrier(x: number, z: number, length: number, yaw: number) {
    const b = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(0.18, 0.55, length / 2)),
      position: new CANNON.Vec3(x, terrainHeight(x, z) + 0.55, z),
    });
    b.quaternion.setFromEuler(0, yaw, 0);
    b.updateAABB();
    this.world.addBody(b);
  }
  reset(progress: number) {
    const pose = trackPose(progress);
    this.body.position.set(
      pose.position.x,
      terrainHeight(pose.position.x, pose.position.z) +
        this.spec.radius +
        this.spec.suspension +
        0.15,
      pose.position.z,
    );
    this.body.quaternion.setFromEuler(pose.pitch, pose.yaw, 0, 'YXZ');
    this.body.aabbNeedsUpdate = true;
    this.body.velocity.setZero();
    this.body.angularVelocity.setZero();
    this.body.force.setZero();
    this.body.torque.setZero();
    this.body.wakeUp();
    this.refreshCollisions();
    this.gear = 1;
    this.reverse = false;
    this.reverseTimer = 0;
    this.steering = 0;
    this.throttle = this.brake = this.speed = this.signedSpeed = this.slip = 0;
    this.lateralG = this.longitudinalG = 0;
    this.rpm = 950;
    this.shiftCooldown = 0;
    for (let i = 0; i < 4; i++) {
      this.vehicle.applyEngineForce(0, i);
      this.vehicle.setBrake(0, i);
    }
  }
  update(input: DriveInput, dt: number) {
    const { spec, body, vehicle } = this;
    this.collisionRefresh -= dt;
    if (this.collisionRefresh <= 0) this.refreshCollisions();
    const oldVelocity = body.velocity.clone();
    // Short pedal travel gives weight transfer time to develop with touch/keys.
    this.throttle += (input.throttle - this.throttle) * Math.min(1, dt * 8);
    this.brake += (input.brake - this.brake) * Math.min(1, dt * 14);
    const forward = body.quaternion.vmult(new CANNON.Vec3(0, 0, -1));
    this.signedSpeed = body.velocity.dot(forward);
    this.speed = body.velocity.length();
    const near = nearestTrack(body.position.x, body.position.z);
    this.onRoad = near.distance < TRACK_WIDTH / 2 + 0.9;
    this.surface = surfaceAt(body.position.x, body.position.z);
    const side = body.quaternion.vmult(new CANNON.Vec3(1, 0, 0));
    this.slip = Math.abs(body.velocity.dot(side));
    // Digital input is smoothed, not teleported. At speed steering lock is reduced.
    const lock =
      spec.steering /
      (1 + Math.abs(this.signedSpeed) * (this.assists ? 0.045 : 0.024));
    const desired = input.steer * lock;
    this.steering +=
      (desired - this.steering) * Math.min(1, dt * (this.assists ? 5 : 8));
    // Ackermann geometry: the inside front wheel takes a tighter radius.
    const radius =
      spec.wheelbase / Math.max(0.001, Math.tan(Math.abs(this.steering)));
    for (let i = 0; i < 2; i++) {
      const inside =
        (this.steering > 0 && i === 0) || (this.steering < 0 && i === 1);
      vehicle.setSteeringValue(
        Math.sign(this.steering) *
          Math.atan(
            spec.wheelbase / (radius + ((inside ? -1 : 1) * spec.track) / 2),
          ),
        i,
      );
    }
    if (
      input.allowReverse !== false &&
      input.brake > 0.2 &&
      Math.abs(this.signedSpeed) < 0.65 &&
      input.throttle < 0.1
    )
      this.reverseTimer += dt;
    else this.reverseTimer = 0;
    if (this.reverseTimer > 0.45) this.reverse = true;
    if (input.throttle > 0.1) this.reverse = false;
    const wheelRPM =
      (Math.abs(this.signedSpeed) / (2 * Math.PI * spec.radius)) * 60;
    this.rpm = Math.max(
      950,
      wheelRPM * spec.gears[this.gear - 1] * spec.finalDrive,
    );
    this.shiftCooldown -= dt;
    if (!this.reverse && this.shiftCooldown <= 0) {
      if (this.rpm > spec.redline * 0.9 && this.gear < spec.gears.length) {
        this.gear++;
        this.shiftCooldown = 0.35;
      } else if (this.rpm < spec.redline * 0.34 && this.gear > 1) {
        this.gear--;
        this.shiftCooldown = 0.3;
      }
    }
    const torqueCurve = Math.max(
      0.45,
      1 - 0.55 * ((this.rpm / spec.redline - 0.55) / 0.6) ** 2,
    );
    const pedal = this.reverse ? this.brake : this.throttle;
    const drivenWheels = spec.drive === 'RWD' ? 2 : 4;
    const tractionControl = this.assists && this.slip > 3 ? 0.58 : 1;
    const driveForce =
      (spec.torque *
        torqueCurve *
        (this.reverse ? 2.5 : spec.gears[this.gear - 1]) *
        spec.finalDrive *
        0.87) /
      spec.radius /
      drivenWheels;
    const engine =
      (this.reverse ? -1 : 1) *
      driveForce *
      pedal *
      tractionControl *
      (this.rpm > spec.redline ? 0.25 : 1) *
      (this.shiftCooldown > 0.22 ? 0.45 : 1);
    let roadWheels = 0;
    for (let i = 0; i < 4; i++) {
      const wheel = vehicle.wheelInfos[i];
      const powered = i >= 2 || spec.drive !== 'RWD';
      const contact = body.pointToWorldFrame(wheel.chassisConnectionPointLocal);
      const surface = surfaceAt(contact.x, contact.z);
      this.wheelSurfaces[i] = surface;
      if (surface === 'ASPHALT' || surface === 'KERB' || surface === 'PIT LANE')
        roadWheels++;
      const offroad =
        spec.kind === 'rally' ? 0.65 : spec.kind === 'truck' ? 0.6 : 0.42;
      const surfaceGrip =
        surface === 'ASPHALT' || surface === 'PIT LANE'
          ? 1
          : surface === 'KERB'
            ? 0.87
            : surface === 'RUNOFF'
              ? 0.58
              : offroad;
      const staticLoad = (spec.mass * 9.81) / 4;
      const load = Math.max(0, wheel.suspensionForce);
      // Tire load sensitivity: doubling load gives less than double grip.
      const mu =
        spec.grip *
        surfaceGrip *
        Math.pow(Math.max(0.4, load / staticLoad), -0.08);
      const gripForce = load * mu;
      vehicle.applyEngineForce(
        powered ? Math.max(-gripForce, Math.min(gripForce, engine)) : 0,
        i,
      );
      const braking = this.reverse ? 0 : this.brake;
      const bias = i < 2 ? 1.22 : 0.78;
      const serviceBrake = braking * spec.brake * bias;
      const engineBrake =
        powered && pedal < 0.05 && this.speed > 1
          ? ((spec.mass * 0.4) / drivenWheels) * dt
          : 0;
      vehicle.setBrake(
        Math.min(
          serviceBrake +
            engineBrake +
            (input.handbrake && i >= 2 ? spec.brake * 1.6 : 0),
          gripForce * dt,
        ) + (pedal < 0.01 && this.speed < 0.15 ? 2 : 0),
        i,
      );
      wheel.frictionSlip = mu * (input.handbrake && i >= 2 ? 0.32 : 1);
    }
    // Axle anti-roll bars resist roll through forces, never orientation snapping.
    const up = body.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
    for (let axle = 0; axle < 4; axle += 2) {
      const left = vehicle.wheelInfos[axle],
        right = vehicle.wheelInfos[axle + 1];
      if (!left.isInContact || !right.isInContact) continue;
      const force = Math.max(
        -spec.mass * 2,
        Math.min(
          spec.mass * 2,
          (left.suspensionLength - right.suspensionLength) *
            (spec.kind === 'truck' ? 7000 : 11000),
        ),
      );
      body.applyForce(
        up.scale(-force),
        body.quaternion.vmult(left.chassisConnectionPointLocal),
      );
      body.applyForce(
        up.scale(force),
        body.quaternion.vmult(right.chassisConnectionPointLocal),
      );
    }
    if (this.speed > 0.01) {
      const resistance =
        spec.drag * this.speed ** 2 +
        spec.mass *
          9.81 *
          (0.013 + (1 - roadWheels / 4) * 0.065) *
          (vehicle.numWheelsOnGround / 4);
      body.applyForce(body.velocity.scale(-resistance / this.speed));
      body.applyForce(new CANNON.Vec3(0, -spec.downforce * this.speed ** 2, 0));
    }
    this.world.step(dt);
    const acceleration = body.velocity.vsub(oldVelocity).scale(1 / dt / 9.81);
    const smooth = Math.min(1, dt * 6);
    this.lateralG += (acceleration.dot(side) - this.lateralG) * smooth;
    this.longitudinalG +=
      (acceleration.dot(forward) - this.longitudinalG) * smooth;
  }
}
