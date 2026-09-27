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
  radius = 0.03,
) {
  return mesh(
    new RoundedBoxGeometry(size[0], size[1], size[2], 2, radius),
    material,
    parent,
    position[0],
    position[1],
    position[2],
  );
}
function profile(sections: number[][]) {
  const vertices: number[] = [],
    indices: number[] = [];
  for (const [z, w, bottom, top] of sections) {
    const bevel = Math.min(0.1, (top - bottom) * 0.2);
    for (const [x, y] of [
      [-w * 0.9, bottom],
      [-w, bottom + bevel],
      [-w, top - bevel],
      [-w * 0.86, top],
      [w * 0.86, top],
      [w, top - bevel],
      [w, bottom + bevel],
      [w * 0.9, bottom],
    ])
      vertices.push(x, y, z);
  }
  for (let j = 0; j < sections.length - 1; j++)
    for (let i = 0; i < 8; i++) {
      const a = j * 8 + i,
        b = j * 8 + ((i + 1) % 8),
        c = (j + 1) * 8 + i,
        d = (j + 1) * 8 + ((i + 1) % 8);
      indices.push(a, b, c, b, d, c);
    }
  for (let i = 1; i < 7; i++) {
    indices.push(0, i + 1, i);
    const o = (sections.length - 1) * 8;
    indices.push(o, o + i, o + i + 1);
  }
  for (let i = 0; i < indices.length; i += 3) {
    const b = indices[i + 1];
    indices[i + 1] = indices[i + 2];
    indices[i + 2] = b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
export function createCar(spec: VehicleSpec, color = spec.color): CarModel {
  const body = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.65,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
  });
  const black = mat(0x13191b, 0.1, 0.56),
    rubber = mat(0x111314, 0, 0.86),
    chrome = mat(0xa3abb0, 0.85, 0.22),
    glass = new THREE.MeshPhysicalMaterial({
      color: 0x152834,
      metalness: 0.5,
      roughness: 0.14,
      clearcoat: 1,
    });
  const lights = new THREE.MeshStandardMaterial({
    color: 0xedf8ff,
    emissive: 0xaacfff,
    emissiveIntensity: 1.4,
  });
  const brakeLights = new THREE.MeshStandardMaterial({
    color: 0xd62015,
    emissive: 0xff1509,
    emissiveIntensity: 0.45,
  });
  const w = spec.width / 2,
    l = spec.length / 2,
    truck = spec.kind === 'truck',
    rally = spec.kind === 'rally';
  mesh(
    profile([
      [-l, 0.83 * w, 0.02, 0.25],
      [-l + 0.28, 0.97 * w, -0.08, 0.39],
      [-spec.wheelbase / 2, w, -0.1, 0.49],
      [0, w, -0.1, 0.48],
      [spec.wheelbase / 2, w, -0.1, 0.47],
      [l - 0.16, 0.96 * w, -0.04, 0.38],
      [l, 0.88 * w, 0.02, 0.3],
    ]),
    paint,
    body,
  );
  box(body, black, [spec.width * 0.94, 0.12, spec.length * 0.95], [0, -0.1, 0]);
  const roofHeight = truck ? 1.2 : rally ? 1.06 : 0.87;
  const cabinBack = truck ? 0.45 : rally ? 1.4 : 1.02;
  const cabinFront = truck ? -0.8 : rally ? -0.85 : -0.72;
  mesh(
    profile([
      [cabinFront - 0.33, w * 0.81, 0.4, 0.43],
      [cabinFront + 0.13, w * 0.68, 0.44, roofHeight - 0.06],
      [cabinBack - 0.35, w * 0.67, 0.45, roofHeight],
      [cabinBack + 0.33, w * 0.82, 0.43, 0.47],
    ]),
    glass,
    body,
  );
  box(
    body,
    paint,
    [w * 1.32, 0.065, cabinBack - cabinFront - 0.35],
    [0, roofHeight - 0.015, (cabinFront + cabinBack) / 2 - 0.05],
  );
  // Door seams, body shoulders, mirrors and handles.
  for (const sign of [-1, 1]) {
    box(
      body,
      paint,
      [0.055, 0.055, cabinBack - cabinFront + 1.1],
      [sign * w * 0.87, 0.43, (cabinBack + cabinFront) / 2],
    );
    box(body, black, [0.02, 0.015, 1.58], [sign * w * 1.003, 0.21, 0.1], 0.004);
    box(
      body,
      chrome,
      [0.035, 0.03, 0.17],
      [sign * w * 1.01, 0.37, 0.35],
      0.009,
    );
    box(
      body,
      paint,
      [0.2, 0.11, 0.24],
      [sign * (w + 0.06), 0.59, cabinFront + 0.24],
    );
    box(
      body,
      black,
      [0.02, 0.08, 0.18],
      [sign * (w + 0.17), 0.6, cabinFront + 0.24],
    );
    const pillar = box(
      body,
      paint,
      [0.05, roofHeight - 0.4, 0.045],
      [sign * w * 0.72, (roofHeight + 0.43) / 2, cabinBack - 0.33],
    );
    pillar.rotation.x = 0.05;
    box(
      body,
      black,
      [0.035, 0.095, 0.48],
      [sign * w * 1.006, 0.2, -spec.wheelbase / 2 + 0.45],
    );
    box(
      body,
      lights,
      [w * 0.64, 0.065, 0.08],
      [sign * w * 0.61, 0.28, -l - 0.006],
    );
    box(
      body,
      brakeLights,
      [w * 0.65, 0.07, 0.06],
      [sign * w * 0.6, 0.27, l + 0.015],
    );
    const exhaust = mesh(
      new THREE.CylinderGeometry(0.07, 0.075, 0.16, 12),
      chrome,
      body,
      sign * w * 0.72,
      -0.03,
      l + 0.05,
    );
    exhaust.rotation.x = Math.PI / 2;
  }
  box(body, black, [w * 0.78, 0.17, 0.07], [0, 0.12, -l - 0.015]);
  for (let i = -3; i <= 3; i++)
    box(body, chrome, [0.015, 0.13, 0.008], [i * 0.1, 0.13, -l - 0.057], 0.002);
  box(body, black, [spec.width * 0.87, 0.05, 0.22], [0, -0.01, -l + 0.03]);
  box(body, black, [0.54, 0.14, 0.04], [0, 0.13, l + 0.034]);
  // Hood pressings, subtle racing stripes, vents, and roof antenna.
  for (const sign of [-1, 1])
    box(body, paint, [0.025, 0.035, 0.76], [sign * 0.42, 0.46, -l + 0.85]);
  if (!truck) {
    for (const sign of [-1, 1]) {
      box(body, black, [0.24, 0.018, 0.35], [sign * 0.43, 0.493, -0.99]);
      box(body, black, [0.035, 0.29, 0.07], [sign * 0.6, 0.54, l - 0.23]);
    }
    box(body, paint, [spec.width * 0.97, 0.065, 0.3], [0, 0.72, l - 0.21]);
    if (rally) {
      box(body, black, [0.45, 0.11, 0.3], [0, 0.53, -1.2]);
      box(body, black, [0.025, 0.22, 0.025], [0, roofHeight + 0.1, 0.9], 0.005);
    }
  } else {
    box(body, black, [spec.width * 0.81, 0.045, 1.48], [0, 0.44, 1.3]);
    for (const sign of [-1, 1])
      box(body, paint, [0.16, 0.2, 1.6], [sign * w * 0.85, 0.55, 1.25]);
    box(body, paint, [spec.width * 0.92, 0.24, 0.11], [0, 0.51, l - 0.08]);
    box(body, black, [spec.width * 1.06, 0.17, 0.18], [0, -0.01, l]);
    for (const sign of [-1, 1])
      box(body, chrome, [0.13, 0.1, 2.28], [sign * (w + 0.1), -0.14, -0.1]);
  }
  const wheels: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const wheel = new THREE.Group();
    const tire = mesh(
      new THREE.CylinderGeometry(spec.radius, spec.radius, 0.27, 32),
      rubber,
      wheel,
    );
    tire.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const rim = mesh(
        new THREE.CylinderGeometry(
          spec.radius * 0.71,
          spec.radius * 0.71,
          0.02,
          24,
        ),
        chrome,
        wheel,
        side * 0.14,
      );
      rim.rotation.z = Math.PI / 2;
      const disc = mesh(
        new THREE.CylinderGeometry(
          spec.radius * 0.57,
          spec.radius * 0.57,
          0.024,
          24,
        ),
        black,
        wheel,
        side * 0.156,
      );
      disc.rotation.z = Math.PI / 2;
      for (let j = 0; j < 7; j++) {
        const a = (j * Math.PI * 2) / 7;
        const spoke = box(
          wheel,
          chrome,
          [0.027, spec.radius * 0.55, 0.038],
          [
            side * 0.174,
            Math.cos(a) * spec.radius * 0.34,
            Math.sin(a) * spec.radius * 0.34,
          ],
          0.008,
        );
        spoke.rotation.x = a;
      }
      const hub = mesh(
        new THREE.CylinderGeometry(0.066, 0.066, 0.036, 12),
        chrome,
        wheel,
        side * 0.175,
      );
      hub.rotation.z = Math.PI / 2;
      const ring = mesh(
        new THREE.TorusGeometry(spec.radius * 0.83, 0.012, 4, 32),
        rubber,
        wheel,
        side * 0.14,
      );
      ring.rotation.y = Math.PI / 2;
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
