import * as THREE from 'three';
import { createScenery } from './scenery.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  terrainData,
  terrainHeight,
  TERRAIN_STEP,
  TERRAIN_X,
  TERRAIN_Z,
  TERRAIN_CELLS,
} from './terrain.ts';
import { rails, kerbs, pitWall } from './circuit.ts';
import { createFacilities } from './trackside.ts';
import { Sky } from 'three/addons/objects/Sky.js';
import { trackCurve, trackPose, trackLength, TRACK_WIDTH } from './track.ts';

export interface Barrier {
  x: number;
  z: number;
  length: number;
  yaw: number;
}
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
function strip(inner: number, outer: number, y: number, steps = 1200) {
  const pos: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const lanes = Math.max(1, Math.ceil(Math.abs(outer - inner) / 1.5));
  for (let i = 0; i <= steps; i++) {
    const p = trackPose(i / steps);
    for (let j = 0; j <= lanes; j++) {
      const offset = inner + ((outer - inner) * j) / lanes;
      const x = p.position.x + p.right.x * offset,
        z = p.position.z + p.right.z * offset;
      pos.push(x, terrainHeight(x, z) + y, z);
      uv.push(j / lanes, ((i / steps) * trackLength) / 8);
      if (i < steps && j < lanes) {
        const a = i * (lanes + 1) + j,
          b = a + lanes + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
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
export async function createWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
) {
  scene.background = new THREE.Color(0xb2cbd2);
  scene.fog = new THREE.FogExp2(0xb7c5c3, 0.00105);
  const sky = new Sky();
  sky.scale.setScalar(8000);
  // Expose the atmosphere separately from the sunlit foreground.
  sky.material.fragmentShader = sky.material.fragmentShader.replace(
    'gl_FragColor = vec4( texColor, 1.0 );',
    'gl_FragColor = vec4( texColor * 0.42, 1.0 );',
  );
  const uniforms = sky.material.uniforms;
  uniforms.turbidity.value = 2;
  uniforms.rayleigh.value = 2.4;
  uniforms.mieCoefficient.value = 0.003;
  uniforms.cloudCoverage.value = 0.48;
  uniforms.cloudDensity.value = 0.65;
  uniforms.mieDirectionalG.value = 0.78;
  const sun = new THREE.Vector3().setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(67),
    THREE.MathUtils.degToRad(145),
  );
  uniforms.sunPosition.value.copy(sun);
  scene.add(sky);
  const envScene = new THREE.Scene();
  const envSky = sky.clone();
  envScene.add(envSky);
  const groundReflection = new THREE.Mesh(
    new THREE.CircleGeometry(4000, 32),
    new THREE.MeshBasicMaterial({ color: 0x595b43 }),
  );
  groundReflection.rotation.x = -Math.PI / 2;
  groundReflection.position.y = -8;
  envScene.add(groundReflection);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0.03);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.18;
  pmrem.dispose();
  groundReflection.geometry.dispose();
  groundReflection.material.dispose();
  scene.add(new THREE.HemisphereLight(0xbfd9f0, 0x655437, 0.85));
  const light = new THREE.DirectionalLight(0xffe3b3, 2.8);
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
  const loader = new THREE.TextureLoader();
  const [asphalt, asphaltNormal, grass, treeTexture] = await Promise.all(
    [
      'asphalt-color.webp',
      'asphalt-normal.webp',
      'coastal-ground.webp',
      'coastal-tree.webp',
    ].map((name) =>
      loader.loadAsync(`${import.meta.env.BASE_URL}textures/${name}`),
    ),
  );
  for (const texture of [asphalt, asphaltNormal, grass]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  asphalt.colorSpace =
    grass.colorSpace =
    treeTexture.colorSpace =
      THREE.SRGBColorSpace;
  asphalt.repeat.set(2, 1.2);
  asphaltNormal.repeat.copy(asphalt.repeat);
  grass.repeat.set(75, 75);
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
      const x = TERRAIN_X + i * TERRAIN_STEP,
        z = TERRAIN_Z - j * TERRAIN_STEP;
      const patch =
        Math.sin(x * 0.033 + Math.sin(z * 0.026) * 2) *
        Math.cos(z * 0.018 - x * 0.011);
      const shade = 0.83 + patch * 0.17;
      landColor.push(shade * 1.06, shade, shade * 0.85);
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
    strip(-TRACK_WIDTH / 2, TRACK_WIDTH / 2, 0.035),
    new THREE.MeshStandardMaterial({
      map: asphalt,
      roughness: 0.86,
      normalMap: asphaltNormal,
      normalScale: new THREE.Vector2(0.32, 0.32),
      side: THREE.DoubleSide,
    }),
  );
  road.castShadow = false;
  const gravel = canvasTexture((ctx) => {
    ctx.fillStyle = '#a29b88';
    ctx.fillRect(0, 0, 512, 512);
    let seed = 7261;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 16000; i++) {
      const shade = Math.floor(105 + random() * 95);
      ctx.fillStyle = `rgb(${shade},${shade - 5},${shade - 17})`;
      ctx.fillRect(
        random() * 512,
        random() * 512,
        1 + random() * 3,
        1 + random() * 2,
      );
    }
  });
  gravel.wrapS = gravel.wrapT = THREE.RepeatWrapping;
  gravel.repeat.set(2, 4);
  gravel.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const shoulder = new THREE.MeshStandardMaterial({
    map: gravel,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  for (const side of [-1, 1]) {
    const m = addMesh(
      scene,
      strip((side * TRACK_WIDTH) / 2, side * (TRACK_WIDTH / 2 + 5), 0.012),
      shoulder,
    );
    m.castShadow = false;
  }
  for (const side of [-1, 1]) {
    const m = addMesh(
      scene,
      strip(
        side * (TRACK_WIDTH / 2 - 0.18),
        side * (TRACK_WIDTH / 2 - 0.03),
        0.055,
      ),
      new THREE.MeshStandardMaterial({
        color: 0xd8d8ce,
        side: THREE.DoubleSide,
      }),
    );
    m.castShadow = false;
  }
  // Purpose-built circuit: apex kerbs, generous runoff, and no highway center dashes.
  const o = new THREE.Object3D();
  for (let color = 0; color < 2; color++) {
    const selected = kerbs.filter((_, i) => Math.floor(i / 2) % 2 === color);
    const m = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      material(color ? 0xa64336 : 0xe6e4d8),
      selected.length,
    );
    selected.forEach((k, i) => {
      o.position.set(k.x, k.y, k.z);
      o.rotation.set(k.pitch, k.yaw, 0, 'YXZ');
      o.scale.set(k.width, k.height, k.length);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.receiveShadow = true;
    scene.add(m);
  }
  const rubber = addMesh(
    scene,
    strip(-1.4, 1.4, 0.045),
    new THREE.MeshStandardMaterial({
      color: 0x202522,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      roughness: 0.95,
      side: THREE.DoubleSide,
    }),
  );
  rubber.castShadow = false;
  const scenery = createScenery(scene, grass, treeTexture);
  const railMat = material(0x929b9a, 0.36, 0.65);
  for (const level of [0.25, 0.75]) {
    const m = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      railMat,
      rails.length,
    );
    rails.forEach((r, i) => {
      o.position.set(r.x, r.y - 0.6 + level, r.z);
      o.rotation.set(r.pitch, r.yaw, 0, 'YXZ');
      o.scale.set(0.2, 0.25, r.length);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
  const posts = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.14, 1.15, 0.14),
    railMat,
    rails.length,
  );
  rails.forEach((r, i) => {
    o.position.set(r.x, r.y - 0.05, r.z);
    o.rotation.set(0, r.yaw, 0);
    o.scale.set(1, 1, 1);
    o.updateMatrix();
    posts.setMatrixAt(i, o.matrix);
  });
  posts.castShadow = true;
  scene.add(posts);
  addMesh(
    scene,
    new THREE.BoxGeometry(pitWall.width, pitWall.height, pitWall.length),
    material(0xbabbb2),
    pitWall.x,
    pitWall.y,
    pitWall.z,
  );
  createFacilities(scene);
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
  const checkerParts: THREE.BufferGeometry[][] = [[], []];
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 20; col++) {
      const g = new THREE.PlaneGeometry(TRACK_WIDTH / 20, 0.52);
      g.rotateX(-Math.PI / 2);
      g.translate(
        ((col + 0.5) * TRACK_WIDTH) / 20 - TRACK_WIDTH / 2,
        0.033,
        (row - 0.5) * 0.52,
      );
      checkerParts[(col + row) % 2].push(g);
    }
  checkerParts.forEach((parts, i) => {
    const m = addMesh(
      gantry,
      mergeGeometries(parts)!,
      material(i ? 0xf3f0df : 0x24282a),
    );
    m.castShadow = false;
    parts.forEach((g) => g.dispose());
  });
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
  return {
    light,
    sun,
    gate,
    trackLength,
    ...scenery,
    update: (time: number) => {
      scenery.update(time);
      uniforms.time.value = time;
    },
    trackCurve,
  };
}
