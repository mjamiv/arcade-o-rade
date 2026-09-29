import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { VehicleSpec } from './vehicles.ts';

export interface CarModel {
  body: THREE.Group;
  wheels: THREE.Group[];
  paint: THREE.MeshPhysicalMaterial;
  brakeLights: THREE.MeshStandardMaterial;
}
const mat = (color: number, metalness = 0, roughness = 0.5) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });
function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  parent: THREE.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(
  parent: THREE.Object3D,
  material: THREE.Material,
  size: number[],
  position: number[],
  radius = 0.02,
) {
  return mesh(
    new RoundedBoxGeometry(size[0], size[1], size[2], 1, radius),
    material,
    parent,
    ...(position as [number, number, number]),
  );
}
function beam(
  parent: THREE.Object3D,
  material: THREE.Material,
  a: number[],
  b: number[],
  radius: number,
) {
  const start = new THREE.Vector3(...a),
    end = new THREE.Vector3(...b),
    delta = end.clone().sub(start);
  const m = mesh(
    new THREE.CylinderGeometry(radius, radius, delta.length(), 6),
    material,
    parent,
  );
  m.position.copy(start.add(end).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  return m;
}
// Ring lofts keep curved shoulders continuous while the side sill rises around each wheel.
function loft(rings: number[][][]) {
  const positions: number[] = [],
    indices: number[] = [];
  const n = rings[0].length;
  for (const ring of rings) for (const p of ring) positions.push(...p);
  for (let j = 0; j < rings.length - 1; j++)
    for (let i = 0; i < n; i++) {
      const a = j * n + i,
        b = j * n + ((i + 1) % n),
        c = a + n,
        d = b + n;
      indices.push(a, c, b, b, c, d);
    }
  for (let i = 1; i < n - 1; i++) {
    indices.push(0, i, i + 1);
    const o = (rings.length - 1) * n;
    indices.push(o, o + i + 1, o + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function createCar(spec: VehicleSpec, color = spec.color): CarModel {
  const body = new THREE.Group(),
    truck = spec.kind === 'truck',
    rally = spec.kind === 'rally';
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.42,
    roughness: 0.26,
    envMapIntensity: 2.2,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const black = mat(0x121719, 0.12, 0.52),
    rubber = mat(0x171a1b, 0, 0.92),
    chrome = mat(0xb9c0c3, 0.88, 0.23),
    rimMat = mat(0x9da5a8, 0.82, 0.27),
    discMat = mat(0x535b5e, 0.75, 0.5),
    caliper = mat(0xb83523, 0.2, 0.35);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x14252b,
    metalness: 0.24,
    roughness: 0.08,
    envMapIntensity: 2.2,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  const lights = new THREE.MeshStandardMaterial({
    color: 0xf0f8ff,
    emissive: 0xc5e5ff,
    emissiveIntensity: 2,
  });
  const brakeLights = new THREE.MeshStandardMaterial({
    color: 0x8e0a0b,
    emissive: 0xff160a,
    emissiveIntensity: 0.45,
  });
  const w = spec.width / 2,
    l = spec.length / 2,
    axle = spec.wheelbase / 2;
  const rings: number[][][] = [];
  for (let i = 0; i <= 88; i++) {
    const z = -l + (spec.length * i) / 88,
      edge = Math.abs(z) / l;
    const shoulder =
      w * (1 - 0.14 * Math.pow(edge, 5) + 0.018 * Math.cos((z + axle) * 3));
    const top = (truck ? 0.59 : rally ? 0.49 : 0.43) - 0.18 * Math.pow(edge, 5);
    const r = spec.radius + 0.055,
      dist = Math.min(Math.abs(z - axle), Math.abs(z + axle));
    const cut =
      dist < r ? Math.max(-0.12, Math.sqrt(r * r - dist * dist) - 0.14) : -0.12;
    rings.push([
      [-shoulder * 0.7, -0.12, z],
      [-shoulder * 0.98, cut, z],
      [-shoulder, Math.max(cut + 0.018, top - 0.12), z],
      [-shoulder * 0.94, top - 0.025, z],
      [-shoulder * 0.7, top + 0.025, z],
      [shoulder * 0.7, top + 0.025, z],
      [shoulder * 0.94, top - 0.025, z],
      [shoulder, Math.max(cut + 0.018, top - 0.12), z],
      [shoulder * 0.98, cut, z],
      [shoulder * 0.7, -0.12, z],
    ]);
  }
  mesh(loft(rings), paint, body);
  // The undertray stays inside the arch openings, rather than covering the tires.
  box(
    body,
    black,
    [spec.width * 0.67, 0.09, spec.length * 0.92],
    [0, -0.12, 0],
  );
  const roof = truck ? 1.15 : rally ? 0.99 : 0.78;
  const zFront = truck ? -0.95 : rally ? -1.02 : -0.88,
    zRoofFront = truck ? -0.48 : rally ? -0.48 : -0.22;
  const zRoofBack = truck ? 0.22 : rally ? 0.8 : 0.56,
    zBack = truck ? 0.61 : rally ? 1.48 : 1.28;
  const cabinRings = [
    [zFront, w * 0.84, 0.42, 0.455],
    [zRoofFront, w * 0.66, 0.44, roof],
    [zRoofBack, w * 0.65, 0.44, roof + 0.015],
    [zBack, w * 0.84, 0.43, 0.46],
  ].map(([z, width, bottom, top]) => [
    [-w * 0.84, bottom, z],
    [-width, top - 0.035, z],
    [-width * 0.94, top, z],
    [width * 0.94, top, z],
    [width, top - 0.035, z],
    [w * 0.84, bottom, z],
  ]);
  mesh(loft(cabinRings), glass, body);
  // Curved painted roof, with visible structural pillars framing separate windows.
  mesh(
    loft([
      [
        [-w * 0.66, roof - 0.022, zRoofFront],
        [-w * 0.6, roof + 0.02, zRoofFront],
        [w * 0.6, roof + 0.02, zRoofFront],
        [w * 0.66, roof - 0.022, zRoofFront],
      ],
      [
        [-w * 0.65, roof + 0.002, zRoofBack],
        [-w * 0.59, roof + 0.04, zRoofBack],
        [w * 0.59, roof + 0.04, zRoofBack],
        [w * 0.65, roof + 0.002, zRoofBack],
      ],
    ]),
    paint,
    body,
  );
  for (const side of [-1, 1]) {
    beam(
      body,
      paint,
      [side * w * 0.84, 0.455, zFront],
      [side * w * 0.66, roof, zRoofFront],
      0.025,
    );
    beam(
      body,
      paint,
      [side * w * 0.65, roof + 0.01, zRoofBack],
      [side * w * 0.84, 0.46, zBack],
      truck ? 0.055 : 0.045,
    );
    beam(
      body,
      black,
      [side * w * 0.845, 0.46, rally ? 0.27 : 0.35],
      [side * w * 0.665, roof + 0.006, rally ? 0.27 : 0.35],
      0.023,
    );
    beam(
      body,
      chrome,
      [side * w * 0.846, 0.446, zFront],
      [side * w * 0.846, 0.448, zBack],
      0.012,
    );
    box(
      body,
      paint,
      [0.21, 0.105, 0.25],
      [side * (w + 0.035), 0.56, zFront + 0.2],
      0.045,
    );
    box(
      body,
      glass,
      [0.016, 0.07, 0.18],
      [side * (w + 0.14), 0.565, zFront + 0.225],
    );
    // Flush handles and a deliberate dark rocker panel below the door.
    box(
      body,
      chrome,
      [0.025, 0.024, 0.14],
      [side * w * 1.004, 0.32, 0.27],
      0.006,
    );
    box(
      body,
      black,
      [0.052, 0.095, axle * 2 - spec.radius * 2 - 0.15],
      [side * w * 0.99, -0.055, 0],
    );
    beam(
      body,
      black,
      [side * w * 0.994, 0.3, zBack - 0.18],
      [side * w * 0.995, -0.045, zBack - 0.18],
      0.004,
    );
    // Fender lips are true open semicircles following the arch cut-outs.
    for (const wheelZ of [-axle, axle]) {
      const lip = mesh(
        new THREE.TorusGeometry(
          spec.radius + 0.065,
          truck ? 0.043 : 0.022,
          4,
          32,
          Math.PI,
        ),
        truck ? black : paint,
        body,
        side * w * 0.985,
        -0.14,
        wheelZ,
      );
      lip.rotation.y = Math.PI / 2;
    }
    const lampW = truck ? 0.43 : rally ? 0.39 : 0.49,
      lampY = truck ? 0.3 : rally ? 0.19 : 0.16;
    box(
      body,
      black,
      [lampW + 0.045, truck ? 0.18 : 0.1, 0.045],
      [side * w * 0.57, lampY, -l + 0.003],
      0.022,
    );
    if (rally) {
      for (const offset of [-0.09, 0.09]) {
        const ring = mesh(
          new THREE.TorusGeometry(0.044, 0.009, 5, 18),
          chrome,
          body,
          side * w * 0.57 + offset,
          lampY,
          -l - 0.024,
        );
        ring.rotation.y = Math.PI;
        const lamp = mesh(
          new THREE.CircleGeometry(0.034, 18),
          lights,
          body,
          side * w * 0.57 + offset,
          lampY,
          -l - 0.027,
        );
        lamp.rotation.y = Math.PI;
      }
    } else {
      box(
        body,
        lights,
        [lampW, 0.025, 0.05],
        [side * w * 0.57, lampY + 0.024, -l - 0.021],
        0.01,
      );
      if (truck)
        box(
          body,
          lights,
          [0.026, 0.14, 0.05],
          [side * w * 0.57 + side * lampW * 0.46, lampY - 0.02, -l - 0.021],
          0.007,
        );
      else
        box(
          body,
          lights,
          [0.105, 0.016, 0.05],
          [side * w * 0.57, lampY - 0.021, -l - 0.024],
          0.006,
        );
    }
    box(
      body,
      black,
      [w * 0.71, 0.14, 0.048],
      [side * w * 0.56, 0.23, l - 0.001],
    );
    box(
      body,
      brakeLights,
      [w * 0.64, 0.035, 0.058],
      [side * w * 0.56, 0.275, l + 0.02],
      0.012,
    );
    box(
      body,
      brakeLights,
      [0.035, 0.09, 0.058],
      [side * w * 0.86, 0.245, l + 0.02],
      0.01,
    );
    const exhaust = mesh(
      new THREE.CylinderGeometry(0.062, 0.07, 0.18, 12),
      chrome,
      body,
      side * w * 0.73,
      -0.055,
      l + 0.04,
    );
    exhaust.rotation.x = Math.PI / 2;
    const opening = mesh(
      new THREE.CircleGeometry(0.05, 12),
      black,
      body,
      side * w * 0.73,
      -0.055,
      l + 0.135,
    );
    opening.rotation.z = Math.PI / 2;
  }
  box(
    body,
    black,
    [w * (truck ? 1.04 : 0.93), truck ? 0.26 : 0.14, 0.06],
    [0, truck ? 0.24 : 0.055, -l - 0.006],
    0.025,
  );
  for (let i = -5; i <= 5; i++)
    box(
      body,
      chrome,
      [0.012, truck ? 0.21 : 0.09, 0.008],
      [i * (truck ? 0.082 : 0.066), truck ? 0.24 : 0.06, -l - 0.043],
      0.001,
    );
  box(body, black, [spec.width * 0.96, 0.035, 0.26], [0, -0.068, -l + 0.03]);
  box(body, black, [spec.width * 0.8, 0.13, 0.15], [0, -0.045, l - 0.015]);
  for (let i = -3; i <= 3; i++)
    box(body, black, [0.025, 0.12, 0.29], [i * 0.17, -0.06, l - 0.06]);
  box(body, chrome, [0.38, 0.085, 0.028], [0, 0.2, l + 0.033], 0.008);
  if (truck) {
    box(body, black, [spec.width * 0.77, 0.035, 1.58], [0, 0.59, 1.36]);
    for (const side of [-1, 1]) {
      box(body, paint, [0.13, 0.18, 1.7], [side * w * 0.87, 0.65, 1.37]);
      box(body, black, [0.18, 0.09, 2.35], [side * (w + 0.08), -0.13, -0.08]);
    }
    box(body, paint, [spec.width * 0.9, 0.21, 0.1], [0, 0.66, l - 0.08]);
    for (let i = -4; i <= 4; i++)
      box(body, black, [0.022, 0.018, 1.49], [i * 0.15, 0.62, 1.36]);
  } else {
    for (const side of [-1, 1]) {
      box(body, black, [0.17, 0.012, 0.29], [side * 0.49, 0.456, -0.95]);
      for (let j = 0; j < 4; j++)
        box(
          body,
          paint,
          [0.19, 0.013, 0.018],
          [side * 0.49, 0.467, -1.07 + j * 0.07],
        );
    }
    if (rally) {
      box(body, black, [0.43, 0.095, 0.28], [0, 0.54, -1.17]);
      box(
        body,
        paint,
        [spec.width * 0.87, 0.06, 0.31],
        [0, roof * 0.83, l - 0.2],
      );
      for (const side of [-1, 1])
        box(body, black, [0.05, 0.37, 0.13], [side * 0.62, 0.66, l - 0.22]);
    } else {
      box(body, paint, [spec.width * 0.88, 0.045, 0.19], [0, 0.415, l - 0.16]);
    }
  }
  const wheels: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const wheel = new THREE.Group(),
      r = spec.radius;
    const tireProfile = [
      new THREE.Vector2(r * 0.65, -0.15),
      new THREE.Vector2(r * 0.87, -0.158),
      new THREE.Vector2(r * 0.98, -0.12),
      new THREE.Vector2(r, -0.075),
      new THREE.Vector2(r, 0.075),
      new THREE.Vector2(r * 0.98, 0.12),
      new THREE.Vector2(r * 0.87, 0.158),
      new THREE.Vector2(r * 0.65, 0.15),
    ];
    const tire = mesh(new THREE.LatheGeometry(tireProfile, 40), rubber, wheel);
    tire.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const rotor = mesh(
        new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.025, 24),
        discMat,
        wheel,
        side * 0.095,
      );
      rotor.rotation.z = Math.PI / 2;
      box(
        wheel,
        caliper,
        [0.045, r * 0.42, 0.075],
        [side * 0.12, r * 0.32, -r * 0.25],
      );
      for (const radius of [r * 0.7, r * 0.65]) {
        const ring = mesh(
          new THREE.TorusGeometry(radius, 0.012, 6, 40),
          rimMat,
          wheel,
          side * 0.153,
        );
        ring.rotation.y = Math.PI / 2;
      }
      const hub = mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.045, 16),
        rimMat,
        wheel,
        side * 0.155,
      );
      hub.rotation.z = Math.PI / 2;
      for (let j = 0; j < (truck ? 6 : 5); j++) {
        const a = (j * Math.PI * 2) / (truck ? 6 : 5);
        for (const split of [-1, 1]) {
          const b = a + split * 0.065;
          const spoke = box(
            wheel,
            rimMat,
            [0.024, r * 0.53, 0.023],
            [side * 0.16, Math.cos(b) * r * 0.39, Math.sin(b) * r * 0.39],
            0.006,
          );
          spoke.rotation.x = b;
        }
        const bolt = mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.006, 6),
          chrome,
          wheel,
          side * 0.182,
          Math.cos(a) * 0.044,
          Math.sin(a) * 0.044,
        );
        bolt.rotation.z = Math.PI / 2;
      }
      for (let j = 0; j < 36; j++) {
        const a = (j * Math.PI * 2) / 36;
        const tread = box(
          wheel,
          black,
          [0.06, 0.014, 0.033],
          [side * 0.11, Math.cos(a) * r * 0.967, Math.sin(a) * r * 0.967],
          0.002,
        );
        tread.rotation.x = a;
      }
    }
    wheels.push(wheel);
  }
  for (const group of [body, ...wheels]) consolidate(group);
  return { body, wheels, paint, brakeLights };
}
function consolidate(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && !Array.isArray(obj.material)) {
      const g = obj.geometry.index
        ? obj.geometry.toNonIndexed()
        : obj.geometry.clone();
      if (!g.getAttribute('uv'))
        g.setAttribute(
          'uv',
          new THREE.Float32BufferAttribute(
            new Float32Array(g.getAttribute('position').count * 2),
            2,
          ),
        );
      g.applyMatrix4(obj.matrixWorld);
      const list = batches.get(obj.material) ?? [];
      list.push(g);
      batches.set(obj.material, list);
      obj.geometry.dispose();
    }
  });
  group.clear();
  for (const [material, geometries] of batches) {
    const geo = mergeGeometries(geometries);
    if (geo) {
      const m = new THREE.Mesh(geo, material);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    }
    for (const g of geometries) g.dispose();
  }
}
