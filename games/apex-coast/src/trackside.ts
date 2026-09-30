import * as THREE from 'three';
import { corners, trackPose, trackLength } from './track.ts';
import { terrainHeight } from './terrain.ts';

function sign(text: string, width: number, height: number, color = '#eef0dc') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#182b30';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 12, 256);
  ctx.font = `bold ${text.length > 8 ? 38 : 130}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 130, 475);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
  );
}
export function createFacilities(scene: THREE.Scene) {
  const metal = new THREE.MeshStandardMaterial({
    color: 0x788582,
    metalness: 0.4,
    roughness: 0.6,
  });
  const concrete = new THREE.MeshStandardMaterial({
    color: 0xd0cbbc,
    roughness: 0.9,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x23373b,
    roughness: 0.65,
  });
  const box = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  // Distance boards face approaching traffic and leave the runoff corridor clear.
  for (const corner of corners) {
    for (const distance of [100, 50]) {
      const p = trackPose(corner.progress - distance / trackLength);
      const side = corner.direction === 'RIGHT' ? -1 : 1;
      const point = p.position.clone().addScaledVector(p.right, side * 12.2);
      const y = terrainHeight(point.x, point.z);
      const board = sign(String(distance), 1.25, 1.65);
      board.position.set(point.x, y + 1.8, point.z);
      board.rotation.y = p.yaw;
      scene.add(board);
      box(scene, point.x, y + 0.85, point.z, 0.08, 1.7, 0.08, metal);
    }
    const p = trackPose(corner.progress - 20 / trackLength);
    const point = p.position
      .clone()
      .addScaledVector(p.right, corner.direction === 'RIGHT' ? -12.3 : 12.3);
    const panel = sign(corner.name, 3.8, 1.05, '#d6f588');
    panel.position.set(point.x, terrainHeight(point.x, point.z) + 1.6, point.z);
    panel.rotation.y = p.yaw;
    scene.add(panel);
  }
  // Dedicated pit apron, garages, control tower and painted starting boxes.
  box(
    scene,
    21,
    -0.01,
    181,
    16,
    0.08,
    144,
    new THREE.MeshStandardMaterial({ color: 0x636868, roughness: 1 }),
  );
  const white = new THREE.MeshStandardMaterial({
    color: 0xe1e0d4,
    roughness: 0.9,
  });
  for (let i = 0; i < 7; i++) {
    const z = 139 + i * 13;
    const group = new THREE.Group();
    group.position.set(31, 0, z);
    scene.add(group);
    box(group, 0, 2.3, 0, 9, 4.6, 11, concrete);
    box(group, -4.55, 1.8, 0, 0.1, 3.1, 8.8, dark);
    box(group, -0.6, 4.7, 0, 11, 0.25, 11.6, metal);
    const label = sign(`0${i + 1}`, 2.1, 0.7);
    label.position.set(-4.63, 3.8, 0);
    label.rotation.y = -Math.PI / 2;
    group.add(label);
    for (const dz of [-4.5, 4.5])
      box(scene, 20.5, 0.065, z + dz, 8, 0.02, 0.12, white);
  }
  box(scene, 32, 4, 240, 11, 8, 10, concrete);
  box(
    scene,
    32,
    7,
    240,
    11.1,
    2.2,
    10.1,
    new THREE.MeshStandardMaterial({
      color: 0x325968,
      metalness: 0.35,
      roughness: 0.18,
    }),
  );
  box(scene, 32, 8.7, 240, 12, 0.3, 11, metal);
  const club = sign('APEX MOTOR CLUB', 10, 1.1);
  club.position.set(26.35, 5.2, 240);
  club.rotation.y = -Math.PI / 2;
  scene.add(club);
  for (let i = 0; i < 6; i++) {
    const x = i % 2 ? 2.7 : -2.7,
      z = 233 + i * 4;
    box(scene, x, 0.055, z, 2, 0.02, 0.14, white);
    box(scene, x - 1, 0.055, z + 1, 0.12, 0.02, 2, white);
  }
}
