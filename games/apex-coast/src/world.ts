import * as THREE from 'three';
import {
  terrainData,
  terrainHeight,
  TERRAIN_STEP,
  TERRAIN_X,
  TERRAIN_Z,
  TERRAIN_CELLS,
} from './terrain.ts';
import { Sky } from 'three/addons/objects/Sky.js';
import {
  trackCurve,
  trackPose,
  trackLength,
  nearestTrack,
  TRACK_WIDTH,
} from './track.ts';

export interface Barrier {
  x: number;
  z: number;
  length: number;
  yaw: number;
}
function random(seed: number) {
  let n = seed;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
const rand = random(1948);
function material(color: number, roughness = 0.8, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function canvasTexture(
  draw: (ctx: CanvasRenderingContext2D) => void,
  width = 512,
  height = 512,
) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function strip(inner: number, outer: number, y: number, steps = 600) {
  const pos: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = trackPose(i / steps);
    for (const offset of [inner, outer]) {
      pos.push(
        p.position.x + p.right.x * offset,
        y,
        p.position.z + p.right.z * offset,
      );
      uv.push(offset === inner ? 0 : 1, ((i / steps) * trackLength) / 8);
    }
    if (i < steps) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function addMesh(
  scene: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
export function createWorld(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.background = new THREE.Color(0xb2cbd2);
  scene.fog = new THREE.FogExp2(0xc1d1cf, 0.00075);
  const sky = new Sky();
  sky.scale.setScalar(8000);
  const uniforms = sky.material.uniforms;
  uniforms.turbidity.value = 3;
  uniforms.rayleigh.value = 1.5;
  uniforms.mieCoefficient.value = 0.005;
  uniforms.mieDirectionalG.value = 0.78;
  const sun = new THREE.Vector3().setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(65),
    THREE.MathUtils.degToRad(238),
  );
  uniforms.sunPosition.value.copy(sun);
  scene.add(sky);
  const envScene = new THREE.Scene();
  const envSky = sky.clone();
  envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0.03);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.18;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xc4e0fa, 0x706044, 1.1));
  const light = new THREE.DirectionalLight(0xfff1d1, 2.7);
  light.position.copy(sun.clone().multiplyScalar(180));
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = -42;
  light.shadow.camera.right = 42;
  light.shadow.camera.top = 42;
  light.shadow.camera.bottom = -42;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 500;
  light.shadow.bias = -0.00025;
  light.shadow.normalBias = 0.035;
  scene.add(light);
  scene.add(light.target);
  const asphalt = canvasTexture((ctx) => {
    ctx.fillStyle = '#383d40';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 24000; i++) {
      const v = Math.floor(40 + rand() * 65);
      ctx.fillStyle = `rgba(${v},${v},${v},.35)`;
      ctx.fillRect(rand() * 512, rand() * 512, 1 + rand() * 2, 1 + rand() * 2);
    }
    for (let i = 0; i < 15; i++) {
      ctx.strokeStyle = '#323739';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rand() * 512, 0);
      ctx.bezierCurveTo(
        rand() * 512,
        180,
        rand() * 512,
        300,
        rand() * 512,
        512,
      );
      ctx.stroke();
    }
  });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const grass = canvasTexture((ctx) => {
    ctx.fillStyle = '#6f7950';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 18000; i++) {
      ctx.fillStyle = rand() > 0.5 ? '#81845b' : '#626e46';
      ctx.globalAlpha = 0.4;
      ctx.fillRect(rand() * 512, rand() * 512, rand() * 6 + 1, rand() * 6 + 1);
    }
  });
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
  grass.repeat.set(160, 160);
  const landPos: number[] = [],
    landUV: number[] = [],
    landColor: number[] = [],
    landIndex: number[] = [];
  for (let i = 0; i <= TERRAIN_CELLS; i++)
    for (let j = 0; j <= TERRAIN_CELLS; j++) {
      landPos.push(
        TERRAIN_X + i * TERRAIN_STEP,
        terrainData[i][j] - 0.04,
        TERRAIN_Z - j * TERRAIN_STEP,
      );
      landUV.push(i / TERRAIN_CELLS, j / TERRAIN_CELLS);
      const shade = 0.86 + rand() * 0.2;
      landColor.push(shade, shade, shade * 0.94);
      if (i < TERRAIN_CELLS && j < TERRAIN_CELLS) {
        const a = i * (TERRAIN_CELLS + 1) + j,
          b = a + TERRAIN_CELLS + 1;
        landIndex.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  const landGeo = new THREE.BufferGeometry();
  landGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(landPos, 3),
  );
  landGeo.setAttribute('uv', new THREE.Float32BufferAttribute(landUV, 2));
  landGeo.setAttribute('color', new THREE.Float32BufferAttribute(landColor, 3));
  landGeo.setIndex(landIndex);
  landGeo.computeVertexNormals();
  const land = addMesh(
    scene,
    landGeo,
    new THREE.MeshStandardMaterial({
      map: grass,
      roughness: 1,
      vertexColors: true,
    }),
  );
  land.castShadow = false;
  const road = addMesh(
    scene,
    strip(-TRACK_WIDTH / 2, TRACK_WIDTH / 2, 0.015),
    new THREE.MeshStandardMaterial({
      map: asphalt,
      roughness: 0.94,
      side: THREE.DoubleSide,
    }),
  );
  road.castShadow = false;
  const shoulder = material(0xada28c);
  for (const side of [-1, 1]) {
    const m = addMesh(
      scene,
      strip((side * TRACK_WIDTH) / 2, side * (TRACK_WIDTH / 2 + 1.3), 0.012),
      shoulder,
    );
    m.material = new THREE.MeshStandardMaterial({
      color: 0xaaa08a,
      side: THREE.DoubleSide,
      roughness: 1,
    });
    m.castShadow = false;
  }
  const white = material(0xdddcd0);
  for (const side of [-1, 1]) {
    const m = addMesh(
      scene,
      strip(
        side * (TRACK_WIDTH / 2 - 0.18),
        side * (TRACK_WIDTH / 2 - 0.03),
        0.028,
      ),
      new THREE.MeshStandardMaterial({
        color: 0xd8d8ce,
        side: THREE.DoubleSide,
      }),
    );
    m.castShadow = false;
  }
  // Alternating curbing follows the entire circuit; instanced for inexpensive detail.
  const kerbGeo = new THREE.BoxGeometry(0.7, 0.1, trackLength / 430 + 0.04),
    kerbMats = [material(0xe6e4d8), material(0xa64336)];
  for (const side of [-1, 1])
    for (let color = 0; color < 2; color++) {
      const m = new THREE.InstancedMesh(kerbGeo, kerbMats[color], 215);
      const o = new THREE.Object3D();
      for (let j = 0; j < 215; j++) {
        const p = trackPose((j * 2 + color) / 430);
        o.position
          .copy(p.position)
          .addScaledVector(p.right, side * (TRACK_WIDTH / 2 + 0.32));
        o.position.y = 0.04;
        o.rotation.y = p.yaw;
        o.updateMatrix();
        m.setMatrixAt(j, o.matrix);
      }
      m.receiveShadow = true;
      scene.add(m);
    }
  const dashGeo = new THREE.PlaneGeometry(0.1, 3.6);
  for (let i = 0; i < Math.floor(trackLength / 16); i++) {
    const p = trackPose(i / Math.floor(trackLength / 16));
    const d = addMesh(scene, dashGeo, white, p.position.x, 0.03, p.position.z);
    d.rotation.set(-Math.PI / 2, 0, -p.yaw);
    d.castShadow = false;
  }
  // Azure sea and a irregular limestone shoreline to the west.
  const sea = addMesh(
    scene,
    new THREE.PlaneGeometry(6000, 6000),
    new THREE.MeshPhysicalMaterial({
      color: 0x3c8194,
      roughness: 0.26,
      metalness: 0.28,
      clearcoat: 0.7,
    }),
    -2100,
    -3.7,
    0,
  );
  sea.rotation.x = -Math.PI / 2;
  sea.castShadow = false;
  sea.receiveShadow = false;
  const cliffMat = material(0xaca38c);
  for (let i = 0; i < 70; i++) {
    const z = -1000 + i * 30;
    const rock = addMesh(
      scene,
      new THREE.IcosahedronGeometry(1, 1),
      cliffMat,
      -385 + Math.sin(i * 0.8) * 12,
      -3,
      z,
    );
    rock.scale.set(12 + rand() * 16, 8 + rand() * 6, 18 + rand() * 18);
    rock.rotation.set(rand(), rand(), rand());
  }
  // Distant ridges are intentionally low detail; nearby props receive real-time shadows.
  const mountainMats = [
    material(0x7b877f),
    material(0x8a9083),
    material(0x64746e),
  ];
  for (let i = 0; i < 30; i++) {
    const angle = -Math.PI * 0.7 + rand() * Math.PI * 1.4;
    const r = 670 + rand() * 650;
    const x = 450 + Math.cos(angle) * r,
      z = Math.sin(angle) * r;
    const h = 90 + rand() * 180;
    const g = new THREE.ConeGeometry(160 + rand() * 250, h, 28, 14);
    const a = g.attributes.position;
    for (let j = 0; j < a.count; j++) {
      if (a.getY(j) < h * 0.4) {
        const x = a.getX(j),
          y = a.getY(j),
          z = a.getZ(j);
        const n =
          Math.sin(x * 0.037 + z * 0.051 + y * 0.024) *
          Math.cos(x * 0.016 - z * 0.024);
        a.setX(j, x + n * 18);
        a.setZ(j, z + n * 14);
      }
    }
    g.computeVertexNormals();
    const m = addMesh(scene, g, mountainMats[i % 3], x, h / 2 - 30, z);
    m.rotation.y = rand() * 6;
    m.castShadow = false;
  }
  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < 1800 && positions.length < 380; i++) {
    const x = -335 + rand() * 980,
      z = -550 + rand() * 1100;
    if (nearestTrack(x, z).distance < 17 || Math.hypot(x - 25, z - 230) < 32)
      continue;
    positions.push(new THREE.Vector3(x, terrainHeight(x, z), z));
  }
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.17, 0.32, 3.8, 6),
    material(0x716451),
    positions.length,
  );
  const pineGeo = new THREE.ConeGeometry(2.3, 7, 16, 9);
  const pinePos = pineGeo.attributes.position;
  for (let i = 0; i < pinePos.count; i++) {
    const factor =
      0.9 +
      0.16 *
        Math.sin(
          pinePos.getX(i) * 9 + pinePos.getZ(i) * 7 + pinePos.getY(i) * 3,
        );
    pinePos.setX(i, pinePos.getX(i) * factor);
    pinePos.setZ(i, pinePos.getZ(i) * factor);
  }
  pineGeo.computeVertexNormals();
  const foliage = new THREE.InstancedMesh(
    pineGeo,
    material(0x263e2d),
    positions.length * 2,
  );
  const dummy = new THREE.Object3D();
  positions.forEach((p, i) => {
    const s = 0.7 + rand() * 0.8;
    dummy.position.copy(p).add(new THREE.Vector3(0, 1.9 * s, 0));
    dummy.scale.setScalar(s);
    dummy.rotation.y = rand() * 6;
    dummy.updateMatrix();
    trunk.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 2; j++) {
      dummy.position.copy(p).add(new THREE.Vector3(0, (5 + j * 2) * s, 0));
      dummy.scale.set(
        s * (1 - j * 0.23),
        s * (1 - j * 0.1),
        s * (1 - j * 0.23),
      );
      dummy.updateMatrix();
      foliage.setMatrixAt(i * 2 + j, dummy.matrix);
    }
  });
  trunk.castShadow = true;
  foliage.castShadow = true;
  foliage.receiveShadow = true;
  scene.add(trunk, foliage);
  const barriers: Barrier[] = [];
  const railMat = material(0x929b9a, 0.36, 0.65),
    posts = material(0x646a64, 0.6, 0.5);
  const railLength = trackLength / 230 + 0.25;
  const railTransforms: THREE.Matrix4[] = [],
    postTransforms: THREE.Matrix4[] = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 230; i++) {
      const t = i / 230;
      if (t > 0.95 || t < 0.035) continue;
      const p = trackPose(t);
      const offset = TRACK_WIDTH / 2 + 3.0;
      const point = p.position.clone().addScaledVector(p.right, side * offset);
      const o = new THREE.Object3D();
      o.position.set(point.x, 0.72, point.z);
      o.rotation.y = p.yaw;
      o.updateMatrix();
      railTransforms.push(o.matrix.clone());
      if (i % 2 === 0) {
        o.position.y = 0.39;
        o.updateMatrix();
        postTransforms.push(o.matrix.clone());
      }
      barriers.push({ x: point.x, z: point.z, length: railLength, yaw: p.yaw });
    }
  }
  for (const [geo, mat, transforms] of [
    [new THREE.BoxGeometry(0.12, 0.32, railLength), railMat, railTransforms],
    [new THREE.BoxGeometry(0.13, 0.85, 0.14), posts, postTransforms],
  ] as const) {
    const instanced = new THREE.InstancedMesh(geo, mat, transforms.length);
    transforms.forEach((m, i) => instanced.setMatrixAt(i, m));
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    scene.add(instanced);
  }
  const signTexture = (text: string, dark = false) =>
    canvasTexture(
      (ctx) => {
        ctx.fillStyle = dark ? '#101b22' : '#e9e5d8';
        ctx.fillRect(0, 0, 512, 128);
        ctx.fillStyle = dark ? '#f0ede4' : '#202d31';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, 256, 79);
      },
      512,
      128,
    );
  const start = trackPose(0);
  const gantry = new THREE.Group();
  gantry.position.copy(start.position);
  gantry.rotation.y = start.yaw;
  scene.add(gantry);
  const dark = material(0x253333, 0.5, 0.6);
  for (const sign of [-1, 1])
    addMesh(
      gantry,
      new THREE.BoxGeometry(0.34, 6, 0.45),
      dark,
      sign * (TRACK_WIDTH / 2 + 1),
      3,
      0,
    );
  addMesh(
    gantry,
    new THREE.BoxGeometry(TRACK_WIDTH + 2.6, 1.25, 0.48),
    dark,
    0,
    5.6,
    0,
  );
  for (const sign of [-1, 1]) {
    const panel = addMesh(
      gantry,
      new THREE.PlaneGeometry(TRACK_WIDTH + 1, 1.02),
      new THREE.MeshBasicMaterial({
        map: signTexture('A P E X   /   C O A S T', true),
      }),
      0,
      5.6,
      sign * 0.25,
    );
    if (sign < 0) panel.rotation.y = Math.PI;
  }
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 20; col++) {
      const tile = addMesh(
        gantry,
        new THREE.PlaneGeometry(TRACK_WIDTH / 20, 0.52),
        material((col + row) % 2 ? 0xf3f0df : 0x24282a),
        ((col + 0.5) * TRACK_WIDTH) / 20 - TRACK_WIDTH / 2,
        0.033,
        (row - 0.5) * 0.52,
      );
      tile.rotation.x = -Math.PI / 2;
      tile.castShadow = false;
    }
  for (let i = 0; i < 5; i++) {
    const p = trackPose(0.04 + i * 0.195);
    const side = i % 2 ? 1 : -1;
    const point = p.position.clone().addScaledVector(p.right, side * 12);
    const sign = addMesh(
      scene,
      new THREE.PlaneGeometry(4.2, 1.1),
      new THREE.MeshStandardMaterial({
        map: signTexture(
          [
            'BRAKE EARLY',
            'FIND YOUR LINE',
            'APEX MOTOR CLUB',
            'SMOOTH IS FAST',
            'ENJOY THE DRIVE',
          ][i],
        ),
        side: THREE.DoubleSide,
      }),
      point.x,
      1.6,
      point.z,
    );
    sign.rotation.y = p.yaw + Math.PI / 2;
  }
  // Trackside paddock and flags beside the start area.
  for (let i = 0; i < 5; i++) {
    const p = trackPose(0.97 + i * 0.006);
    const pos = p.position.clone().addScaledVector(p.right, 19);
    const stand = addMesh(
      scene,
      new THREE.BoxGeometry(5, 2.4, 4),
      material(0xd5d0be),
      pos.x,
      1.2,
      pos.z,
    );
    stand.rotation.y = p.yaw;
    const roof = addMesh(
      scene,
      new THREE.BoxGeometry(5.5, 0.15, 4.8),
      dark,
      pos.x,
      2.5,
      pos.z,
    );
    roof.rotation.y = p.yaw;
  }
  for (let i = 0; i < 8; i++) {
    const p = trackPose(0.018 + i * 0.008);
    const pos = p.position.clone().addScaledVector(p.right, 11.5);
    addMesh(
      scene,
      new THREE.CylinderGeometry(0.035, 0.05, 6, 6),
      chromeMaterial(),
      pos.x,
      3,
      pos.z,
    );
    const flag = addMesh(
      scene,
      new THREE.PlaneGeometry(1.1, 3.1),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? 0xe65f32 : 0xebdfbd,
        side: THREE.DoubleSide,
      }),
      pos.x + 0.55,
      4.1,
      pos.z,
    );
    flag.rotation.y = p.yaw;
  }
  const gate = new THREE.Group();
  const gateMat = new THREE.MeshBasicMaterial({
    color: 0x8be4b4,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  for (const side of [-1, 1])
    addMesh(
      gate,
      new THREE.CylinderGeometry(0.09, 0.09, 3.4, 8),
      gateMat,
      side * 5.8,
      1.7,
      0,
    );
  addMesh(gate, new THREE.BoxGeometry(11.6, 0.07, 0.07), gateMat, 0, 3.4, 0);
  scene.add(gate);
  return { light, sun, barriers, gate, trackLength, sea, trackCurve };
}
function chromeMaterial() {
  return material(0xb1b7b3, 0.5, 0.7);
}
