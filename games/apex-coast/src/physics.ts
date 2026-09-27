import * as CANNON from 'cannon-es';
import { terrainData, TERRAIN_STEP, TERRAIN_X, TERRAIN_Z } from './terrain.ts';
import type { VehicleSpec } from './vehicles.ts';
import { nearestTrack, trackPose, TRACK_WIDTH } from './track.ts';

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
      position: new CANNON.Vec3(TERRAIN_X, -0.035, TERRAIN_Z),
    });
    terrain.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    terrain.updateAABB();
    this.world.addBody(terrain);
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
        rollInfluence: 0.09,
        maxSuspensionForce: spec.mass * 12,
        maxSuspensionTravel: spec.suspension * 0.75,
        customSlidingRotationalSpeed: -30,
        useCustomSlidingRotationalSpeed: true,
      });
    }
    this.vehicle.addToWorld(this.world);
    this.reset(0);
  }
  addBarrier(x: number, z: number, length: number, yaw: number) {
    const b = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(0.18, 0.55, length / 2)),
      position: new CANNON.Vec3(x, 0.55, z),
    });
    b.quaternion.setFromEuler(0, yaw, 0);
    b.updateAABB();
    this.world.addBody(b);
  }
  reset(progress: number) {
    const pose = trackPose(progress);
    this.body.position.set(
      pose.position.x,
      this.spec.radius + this.spec.suspension + 0.15,
      pose.position.z,
    );
    this.body.quaternion.setFromEuler(0, pose.yaw, 0);
    this.body.aabbNeedsUpdate = true;
    this.body.velocity.setZero();
    this.body.angularVelocity.setZero();
    this.body.force.setZero();
    this.body.torque.setZero();
    this.body.wakeUp();
    this.gear = 1;
    this.reverse = false;
    this.reverseTimer = 0;
    this.steering = 0;
    for (let i = 0; i < 4; i++) {
      this.vehicle.applyEngineForce(0, i);
      this.vehicle.setBrake(0, i);
    }
  }
  update(input: DriveInput, dt: number) {
    const { spec, body, vehicle } = this;
    const forward = body.quaternion.vmult(new CANNON.Vec3(0, 0, -1));
    this.signedSpeed = body.velocity.dot(forward);
    this.speed = body.velocity.length();
    const near = nearestTrack(body.position.x, body.position.z);
    this.onRoad = near.distance < TRACK_WIDTH / 2 + 0.6;
    const side = body.quaternion.vmult(new CANNON.Vec3(1, 0, 0));
    this.slip = Math.abs(body.velocity.dot(side));
    // Digital input is smoothed, not teleported. At speed steering lock is reduced.
    const lock =
      spec.steering /
      (1 + Math.abs(this.signedSpeed) * (this.assists ? 0.045 : 0.024));
    const desired = input.steer * lock;
    this.steering +=
      (desired - this.steering) * Math.min(1, dt * (this.assists ? 5 : 8));
    vehicle.setSteeringValue(this.steering, 0);
    vehicle.setSteeringValue(this.steering, 1);
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
    const pedal = this.reverse ? input.brake : input.throttle;
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
      (this.rpm > spec.redline ? 0.25 : 1);
    for (let i = 0; i < 4; i++) {
      const powered = i >= 2 || spec.drive !== 'RWD';
      vehicle.applyEngineForce(powered ? engine : 0, i);
      const brake = this.reverse ? 0 : input.brake;
      vehicle.setBrake(
        brake * spec.brake +
          (input.handbrake && i >= 2 ? spec.brake * 1.6 : 0) +
          (pedal < 0.01 && this.speed < 0.15 ? 2 : 0),
        i,
      );
      const offroad =
        spec.kind === 'rally' ? 0.7 : spec.kind === 'truck' ? 0.65 : 0.44;
      vehicle.wheelInfos[i].frictionSlip =
        spec.grip *
        (this.onRoad ? 1 : offroad) *
        (input.handbrake && i >= 2 ? 0.42 : 1);
    }
    if (this.speed > 0.01) {
      const resistance =
        spec.drag * this.speed ** 2 +
        spec.mass * 9.81 * (this.onRoad ? 0.013 : 0.072);
      body.applyForce(body.velocity.scale(-resistance / this.speed));
      body.applyForce(new CANNON.Vec3(0, -spec.downforce * this.speed ** 2, 0));
    }
    this.world.step(dt);
  }
}
