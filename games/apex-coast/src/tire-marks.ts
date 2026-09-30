import * as THREE from 'three';
import type { DrivingPhysics } from './physics.ts';

// Fixed-size ring buffer: one draw call, no unbounded trail allocations.
export class TireMarks {
  private positions = new Float32Array(1024 * 18);
  private attribute = new THREE.BufferAttribute(this.positions, 3).setUsage(
    THREE.DynamicDrawUsage,
  );
  private geometry = new THREE.BufferGeometry();
  private previous: (THREE.Vector3 | null)[] = [null, null, null, null];
  private cursor = 0;
  private count = 0;
  constructor(scene: THREE.Scene) {
    this.geometry.setAttribute('position', this.attribute);
    this.geometry.setDrawRange(0, 0);
    const mesh = new THREE.Mesh(
      this.geometry,
      new THREE.MeshBasicMaterial({
        color: 0x161c1c,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    mesh.frustumCulled = false;
    scene.add(mesh);
  }
  clear() {
    this.previous.fill(null);
    this.cursor = this.count = 0;
    this.geometry.setDrawRange(0, 0);
  }
  update(physics: DrivingPhysics) {
    let dirty = false;
    physics.vehicle.wheelInfos.forEach((wheel, i) => {
      const road = physics.wheelSurfaces[i] === 'ASPHALT';
      if (!road || !wheel.isInContact || !wheel.sliding || physics.speed < 5) {
        this.previous[i] = null;
        return;
      }
      const p = wheel.raycastResult.hitPointWorld;
      const now = new THREE.Vector3(p.x, p.y + 0.065, p.z);
      const before = this.previous[i];
      if (before) {
        const distance = before.distanceTo(now);
        if (distance < 0.16) return;
        if (distance < 3) {
          const side = new THREE.Vector3(now.z - before.z, 0, before.x - now.x)
            .normalize()
            .multiplyScalar(0.12);
          const a = before.clone().add(side),
            b = before.clone().sub(side);
          const c = now.clone().add(side),
            d = now.clone().sub(side);
          this.positions.set(
            [
              ...a.toArray(),
              ...b.toArray(),
              ...c.toArray(),
              ...b.toArray(),
              ...d.toArray(),
              ...c.toArray(),
            ],
            this.cursor * 18,
          );
          this.cursor = (this.cursor + 1) % 1024;
          this.count = Math.min(1024, this.count + 1);
          dirty = true;
        }
      }
      this.previous[i] = now;
    });
    if (dirty) {
      this.attribute.needsUpdate = true;
      this.geometry.setDrawRange(0, this.count * 6);
    }
  }
}
