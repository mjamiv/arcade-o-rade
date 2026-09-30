import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { nearestTrack, trackPose } from './track.ts';
import { terrainHeight } from './terrain.ts';

const material = (color: number, roughness = 0.9) =>
  new THREE.MeshStandardMaterial({ color, roughness });
function random(seed: number) {
  let n = seed;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
const rand = random(80421);
function instances(
  scene: THREE.Scene,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  transforms: THREE.Matrix4[],
  colors?: THREE.Color[],
  shadow = true,
) {
  const m = new THREE.InstancedMesh(geo, mat, transforms.length);
  transforms.forEach((t, i) => {
    m.setMatrixAt(i, t);
    if (colors) m.setColorAt(i, colors[i]);
  });
  m.castShadow = shadow;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
// Broad continuous ridges replace overlapping cones. All distant ranges are one draw call.
function ridge(
  x: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  seed: number,
) {
  const g = new THREE.PlaneGeometry(width, depth, 72, 20);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position,
    colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i),
      pz = p.getZ(i),
      u = px / width + 0.5,
      v = pz / depth + 0.5;
    const envelope =
      Math.pow(Math.sin(Math.PI * u), 0.65) *
      Math.pow(Math.sin(Math.PI * v), 0.6);
    const noise =
      0.58 +
      0.18 * Math.sin(u * 22 + seed) +
      0.065 * Math.sin(u * 43 + v * 9 + seed) +
      0.018 * Math.sin(u * 91 - v * 18);
    const h = Math.max(0, envelope * height * noise);
    p.setXYZ(i, px + x, h - 6, pz + z);
    const c = new THREE.Color().setHSL(
      0.105 + h * 0.0001,
      0.12,
      0.73 + h * 0.0003 + Math.sin(px * 0.018 + pz * 0.023) * 0.035,
    );
    c.convertSRGBToLinear();
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
// Pre-rendered CC0 tree silhouettes keep detailed foliage inexpensive on mobile.
// Camera-facing quads have cutout depth (not transparent blending), so draw order is stable.
function foliageMaterial(map: THREE.Texture) {
  const material = new THREE.MeshBasicMaterial({
    map,
    alphaTest: 0.38,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec4 center = modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.);
      vec4 mvPosition = viewMatrix * center;
      vec2 size = vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
      mvPosition.xy += transformed.xy * size;
      gl_Position = projectionMatrix * mvPosition;
    `,
    );
  };
  material.customProgramCacheKey = () => 'coast-foliage-billboard-v1';
  return material;
}
export function createScenery(
  scene: THREE.Scene,
  groundTexture: THREE.Texture,
  treeTexture: THREE.Texture,
) {
  const ridges = [
    ridge(1000, -240, 1200, 340, 750, 1),
    ridge(1350, 400, 1650, 460, 1100, 3),
    ridge(720, -850, 1600, 430, 700, 5),
  ];
  const ridgeGeo = mergeGeometries(ridges)!;
  ridges.forEach((g) => g.dispose());
  const mountains = new THREE.Mesh(
    ridgeGeo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      map: groundTexture,
    }),
  );
  scene.add(mountains);
  const dummy = new THREE.Object3D(),
    trees: THREE.Matrix4[] = [],
    treeColors: THREE.Color[] = [];
  for (let i = 0, count = 0; i < 2200 && count < 240; i++) {
    const near = trackPose(rand());
    near.position.addScaledVector(
      near.right,
      (rand() < 0.5 ? -1 : 1) * (25 + rand() * 70),
    );
    const x = count < 170 ? near.position.x : -325 + rand() * 1000,
      z = count < 170 ? near.position.z : -550 + rand() * 1100;
    if (
      nearestTrack(x, z).distance < 21 ||
      (x > 8 && x < 45 && z > 100 && z < 260)
    )
      continue;
    const height = 6 + rand() * 7;
    dummy.position.set(x, terrainHeight(x, z) + height * 0.46, z);
    dummy.scale.set(height * (0.85 + rand() * 0.3), height, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trees.push(dummy.matrix.clone());
    treeColors.push(
      new THREE.Color().setRGB(
        0.85 + rand() * 0.15,
        0.9 + rand() * 0.1,
        0.75 + rand() * 0.15,
      ),
    );
    count++;
  }
  const treeGeo = new THREE.PlaneGeometry(2 / 3, 1),
    leafMaterial = foliageMaterial(treeTexture);
  instances(scene, treeGeo, leafMaterial, trees, treeColors, false);
  const crownGeo = new THREE.PlaneGeometry(2, 2),
    uv = crownGeo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setY(i, 0.35 + uv.getY(i) * 0.65);
  const rocks: THREE.Matrix4[] = [],
    rockColors: THREE.Color[] = [],
    shrubs: THREE.Matrix4[] = [],
    shrubColors: THREE.Color[] = [];
  for (let i = 0; i < 300; i++) {
    const t = rand(),
      p = trackPose(t),
      side = rand() < 0.5 ? -1 : 1,
      offset = 17 + rand() * 38;
    p.position.addScaledVector(p.right, side * offset);
    const { x, z } = p.position;
    if (
      nearestTrack(x, z).distance < 15 ||
      (x > 8 && x < 45 && z > 100 && z < 260)
    )
      continue;
    const h = 0.25 + rand() * 1.1;
    dummy.position.set(x, terrainHeight(x, z) + h * 0.35, z);
    dummy.scale.set(h * (1 + rand()), h, h * (1 + rand()));
    dummy.rotation.set(0, rand() * 6, 0);
    dummy.updateMatrix();
    if (i % 5 === 0) {
      rocks.push(dummy.matrix.clone());
      rockColors.push(
        new THREE.Color().setHSL(0.095, 0.13, 0.45 + rand() * 0.17),
      );
    } else {
      shrubs.push(dummy.matrix.clone());
      shrubColors.push(
        new THREE.Color().setHSL(
          0.18 + rand() * 0.09,
          0.25,
          0.3 + rand() * 0.08,
        ),
      );
    }
  }
  // Weathered limestone forms a readable cliff edge above the water.
  for (let i = 0; i < 100; i++) {
    const z = -1000 + i * 21,
      x = -380 + Math.sin(z * 0.021) * 9;
    dummy.position.set(x, -4, z);
    dummy.scale.set(13 + rand() * 9, 8 + rand() * 5, 15 + rand() * 10);
    dummy.rotation.set(rand() * 0.4, rand() * 6, rand() * 0.3);
    dummy.updateMatrix();
    rocks.push(dummy.matrix.clone());
    rockColors.push(new THREE.Color(0xb8ac92));
  }
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const rp = rockGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i),
      y = rp.getY(i),
      z = rp.getZ(i);
    rp.setXYZ(
      i,
      x * (1 + 0.17 * Math.sin(y * 8 + z * 5)),
      y,
      z * (1 + 0.1 * Math.cos(x * 9)),
    );
  }
  rockGeo.computeVertexNormals();
  instances(scene, rockGeo, material(0xaaa596), rocks, rockColors);
  instances(
    scene,
    crownGeo,
    leafMaterial,
    shrubs,
    shrubColors.map((c) => c.multiplyScalar(2)),
    false,
  );
  // Low overdraw geometry tufts, clustered beside the shoulder, never on the racing surface.
  const bladePositions: number[] = [],
    bladeColors: number[] = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 2.399,
      x = Math.cos(a) * 0.15,
      z = Math.sin(a) * 0.15,
      h = 0.15 + rand() * 0.3;
    bladePositions.push(
      x - 0.025,
      0,
      z,
      x + 0.025,
      0,
      z,
      x + Math.sin(a) * 0.16,
      h,
      z + 0.1,
    );
    bladeColors.push(0.075, 0.09, 0.028, 0.075, 0.09, 0.028, 0.28, 0.24, 0.1);
  }
  const grassGeo = new THREE.BufferGeometry();
  grassGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(bladePositions, 3),
  );
  grassGeo.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(bladeColors, 3),
  );
  grassGeo.computeVertexNormals();
  const bladeNormals = grassGeo.getAttribute('normal');
  for (let i = 0; i < bladeNormals.count; i++)
    bladeNormals.setXYZ(i, 0, 0.94, 0.34);
  const tufts: THREE.Matrix4[] = [];
  for (let i = 0; i < 1400; i++) {
    const p = trackPose(rand()),
      side = rand() < 0.5 ? -1 : 1;
    p.position.addScaledVector(p.right, side * (12 + rand() * 20));
    if (
      nearestTrack(p.position.x, p.position.z).distance < 11.5 ||
      (p.position.x > 8 &&
        p.position.x < 45 &&
        p.position.z > 100 &&
        p.position.z < 260)
    )
      continue;
    dummy.position.copy(p.position);
    dummy.position.y = terrainHeight(p.position.x, p.position.z);
    dummy.scale.setScalar(0.8 + rand() * 1.1);
    dummy.rotation.set(0, rand() * 6.28, 0);
    dummy.updateMatrix();
    tufts.push(dummy.matrix.clone());
  }
  instances(
    scene,
    grassGeo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 1,
    }),
    tufts,
    undefined,
    false,
  );
  // Analytic multi-scale water normals: animated highlights without reflection render targets.
  const seaMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2b7b83,
    roughness: 0.25,
    metalness: 0.22,
    clearcoat: 0.6,
  });
  const time = { value: 0 };
  seaMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.coastTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vCoastPosition;',
      )
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvCoastPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float coastTime; varying vec3 vCoastPosition;',
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
      vec2 p=vCoastPosition.xz;
      float a=sin(p.x*.19+p.y*.09+coastTime*.75);
      float b=cos(p.y*.33-p.x*.12+coastTime*.9);
      float c=sin(p.x*1.7+p.y*1.3-coastTime*1.4);
      normal=normalize(normal+vec3(a*.1+c*.025,b*.12,0.0));
    `,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
      float bands=sin(vCoastPosition.x*.014+sin(vCoastPosition.z*.012)*1.5);
      diffuseColor.rgb *= .88 + .12 * bands;
    `,
      );
  };
  seaMaterial.customProgramCacheKey = () => 'coast-water-v1';
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), seaMaterial);
  sea.position.set(-2100, -3.7, 0);
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);
  // Soft contact shadow is retained on low graphics, where real-time shadows are disabled.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(7,15,18,.65)');
  gradient.addColorStop(0.5, 'rgba(7,15,18,.35)');
  gradient.addColorStop(1, 'rgba(7,15,18,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 6.4),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.022;
  scene.add(shadow);
  // One light coastal landmark, well outside the driveable corridor.
  const lighthouse = new THREE.Group();
  lighthouse.position.set(-343, terrainHeight(-343, -125), -125);
  scene.add(lighthouse);
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 2.25, 17, 20),
    material(0xe5dbbf),
  );
  tower.position.y = 8.5;
  tower.castShadow = true;
  lighthouse.add(tower);
  for (const y of [13.5, 16.9]) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.7, 0.5, 20),
      material(0x933d31),
    );
    ring.position.y = y;
    lighthouse.add(ring);
  }
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 2.1, 12),
    new THREE.MeshStandardMaterial({
      color: 0x344a50,
      metalness: 0.45,
      roughness: 0.16,
    }),
  );
  lantern.position.y = 18;
  lighthouse.add(lantern);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(1.8, 1.5, 20),
    material(0x384847),
  );
  cap.position.y = 19.7;
  lighthouse.add(cap);
  return {
    sea,
    shadow,
    update: (elapsed: number) => {
      time.value = elapsed;
    },
  };
}
