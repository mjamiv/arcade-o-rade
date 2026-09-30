import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import './style.css';
import * as THREE from 'three';
import { VEHICLES, COLORS } from './vehicles.ts';
import { createCar } from './car-model.ts';
import type { CarModel } from './car-model.ts';
import { createWorld } from './world.ts';
import { DrivingPhysics } from './physics.ts';
import type { DriveInput } from './physics.ts';
import { Controls } from './input.ts';
import { EngineAudio } from './audio.ts';
import { RaceState } from './race.ts';
import type { RaceMode } from './race.ts';
import {
  trackPose,
  trackPoints,
  nearestTrack,
  trackLength,
  formatTime,
  TRACK_WIDTH,
  TRACK_ID,
} from './track.ts';
import { terrainHeight } from './terrain.ts';
import { TireMarks } from './tire-marks.ts';
import { drivingAdvice } from './driving-advice.ts';
import { parseSave, SAVE_KEY } from './save.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let save = parseSave(null);
let storageAvailable = true;
try {
  save = parseSave(localStorage.getItem(SAVE_KEY));
} catch {
  storageAvailable = false;
}
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    storageAvailable = false;
  }
  if (!storageAvailable)
    $('save-note').textContent =
      'Browser storage is unavailable. You can still play, but best times will not persist.';
}
const visible = (id: string, show: boolean) =>
  $(id).classList.toggle('hidden', !show);
const settings = $<HTMLDialogElement>('settings');
const emptyInput: DriveInput = {
  throttle: 0,
  brake: 0,
  steer: 0,
  handbrake: false,
};

async function boot() {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  $('scene').append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    48,
    innerWidth / innerHeight,
    0.12,
    6000,
  );
  const world = await createWorld(scene, renderer);
  const marks = new TireMarks(scene);
  const controls = new Controls();
  const sound = new EngineAudio();
  sound.volume = save.volume / 100;
  let phase: 'garage' | 'driving' | 'paused' | 'results' = 'garage';
  let physics: DrivingPhysics;
  let car: CarModel;
  let mode: RaceMode = 'time-trial';
  let race = new RaceState(mode);
  let countdown = 0,
    cameraMode = 0,
    accumulator = 0,
    lastTime = performance.now(),
    messageTime = 0,
    uiTime = 0,
    garageTime = 0;
  let lastInput: DriveInput = emptyInput;
  let newRecord = false;
  let autoRecoverTime = 0;
  let fps = 60,
    frameCount = 0,
    frameTime = 0;
  let trackInfo = nearestTrack(0, 230);
  let lastBrake = 0;
  let lowFrameTime = 0;
  let adaptiveScale = 1;
  const position = new THREE.Vector3(),
    forward = new THREE.Vector3(),
    right = new THREE.Vector3(),
    cameraGoal = new THREE.Vector3(),
    lookGoal = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0),
    q = new THREE.Quaternion();
  const map = $<HTMLCanvasElement>('minimap'),
    ctx = map.getContext('2d')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function key() {
    return `${TRACK_ID}:${VEHICLES[save.vehicle].id}-${save.assists ? 'assisted' : 'unassisted'}`;
  }
  function message(text: string, seconds = 3) {
    $('race-message').textContent = text;
    messageTime = seconds;
  }
  function applyGraphics() {
    const quality = save.quality;
    const mobile = matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        quality === 'high' ? 1.5 : quality === 'low' ? 0.8 : mobile ? 1 : 1.25,
      ) * adaptiveScale,
    );
    world.light.shadow.mapSize.set(
      quality === 'high' ? 2048 : 1024,
      quality === 'high' ? 2048 : 1024,
    );
    world.light.shadow.map?.dispose();
    world.light.shadow.map = null;
    renderer.shadowMap.enabled = quality !== 'low';
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  function applyTouch() {
    const touch = save.touch || matchMedia('(pointer: coarse)').matches;
    document.body.classList.toggle('touch', touch);
    $('touch-controls').classList.toggle('show', touch);
  }
  function setCar(index: number) {
    if (car) {
      scene.remove(car.body, ...car.wheels);
      const materials = new Set<THREE.Material>();
      for (const obj of [car.body, ...car.wheels])
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            for (const m of mats) materials.add(m);
          }
        });
      for (const mat of materials) mat.dispose();
    }
    save.vehicle = index;
    const spec = VEHICLES[index];
    physics = new DrivingPhysics(spec);
    physics.assists = save.assists;
    car = createCar(spec, COLORS[save.color]);
    scene.add(car.body, ...car.wheels);
    for (let i = 0; i < 120; i++)
      physics.update({ ...emptyInput, brake: 1, allowReverse: false }, 1 / 120);
    $('floating-car-name').textContent = spec.name;
    $('floating-drive').textContent =
      spec.drive === 'RWD'
        ? 'REAR-WHEEL DRIVE'
        : spec.drive === 'AWD'
          ? 'ALL-WHEEL DRIVE'
          : 'FOUR-WHEEL DRIVE';
    $('hud-car').textContent = spec.name;
    document
      .querySelectorAll<HTMLButtonElement>('.vehicle-card')
      .forEach((el, i) => {
        el.classList.toggle('active', i === index);
        el.setAttribute('aria-pressed', String(i === index));
      });
    syncCar(true);
    updateCamera(1, true);
    persist();
  }
  function syncCar(refreshTrack = false) {
    // Resets and garage transitions move the chassis outside the physics loop.
    // Refresh road proximity before placing the contact shadow and drawing the HUD.
    if (refreshTrack)
      trackInfo = nearestTrack(
        physics.body.position.x,
        physics.body.position.z,
      );
    car.body.position.copy(physics.body.position);
    car.body.quaternion.copy(physics.body.quaternion);
    for (let i = 0; i < 4; i++) {
      physics.vehicle.updateWheelTransform(i);
      const transform = physics.vehicle.wheelInfos[i].worldTransform;
      car.wheels[i].position.copy(transform.position);
      car.wheels[i].quaternion.copy(transform.quaternion);
    }
    car.brakeLights.emissiveIntensity = lastBrake > 0.1 ? 3 : 0.45;
  }
  function updateCamera(dt: number, snap = false) {
    position.copy(physics.body.position);
    q.copy(physics.body.quaternion);
    forward.set(0, 0, -1).applyQuaternion(q);
    forward.y = 0;
    forward.normalize();
    right.set(-forward.z, 0, forward.x);
    if (phase === 'garage') {
      const angle = reduced ? 0.65 : 0.65 + Math.sin(garageTime * 0.1) * 0.12;
      const distance = innerWidth < 760 ? 10.2 : 10.5;
      cameraGoal
        .copy(position)
        .addScaledVector(forward, Math.cos(angle) * distance)
        .addScaledVector(right, Math.sin(angle) * distance);
      cameraGoal.y = position.y + (innerWidth < 760 ? 2.4 : 2.1);
      const dir = position.clone().sub(cameraGoal).normalize();
      const screenRight = new THREE.Vector3().crossVectors(dir, up).normalize();
      lookGoal
        .copy(position)
        .addScaledVector(screenRight, innerWidth < 760 ? -0.1 : -1.65);
      lookGoal.y = position.y + (innerWidth < 760 ? 0.1 : -0.2);
      camera.fov = innerWidth < 760 ? 48 : 43;
    } else if (cameraMode === 1) {
      cameraGoal.copy(position).addScaledVector(forward, 1.24);
      cameraGoal.y += 0.87;
      lookGoal.copy(cameraGoal).addScaledVector(forward, 30);
      lookGoal.y = terrainHeight(lookGoal.x, lookGoal.z) + 1.05;
      camera.fov = 70;
    } else if (cameraMode === 2) {
      cameraGoal.copy(position).addScaledVector(forward, -13);
      cameraGoal.y += 12;
      lookGoal.copy(position).addScaledVector(forward, 5);
      camera.fov = 57;
    } else {
      const portrait = innerHeight > innerWidth;
      cameraGoal
        .copy(position)
        .addScaledVector(
          forward,
          -(portrait ? 9.3 : 7.5) - physics.speed * 0.025,
        );
      cameraGoal.y += portrait ? 5 : 3.25;
      lookGoal.copy(position).addScaledVector(forward, portrait ? 4.6 : 7);
      lookGoal.y =
        terrainHeight(lookGoal.x, lookGoal.z) + (portrait ? 0.9 : 1.2);
      camera.fov = 57 + Math.min(9, physics.speed * 0.17);
    }
    if (snap || cameraMode === 1) camera.position.copy(cameraGoal);
    else
      camera.position.lerp(
        cameraGoal,
        1 - Math.exp(-dt * (phase === 'garage' ? 3 : 6)),
      );
    camera.lookAt(lookGoal);
    camera.updateProjectionMatrix();
    world.light.position.copy(position).addScaledVector(world.sun, 180);
    world.light.target.position.copy(position);
    world.light.target.updateMatrixWorld();
  }
  function drawMap() {
    ctx.clearRect(0, 0, map.width, map.height);
    const scale = 0.52,
      offsetX = 198,
      offsetY = 143;
    const draw = (x: number, z: number) => [
      x * scale + offsetX,
      z * scale + offsetY,
    ];
    ctx.beginPath();
    trackPoints.forEach((p, i) => {
      const [x, y] = draw(p.x, p.z);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = '#0d201e';
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.strokeStyle = '#b1c4b966';
    ctx.lineWidth = 6;
    ctx.stroke();
    const gate = trackPose(race.nextCheckpoint / race.checkpointCount).position;
    const [gx, gy] = draw(gate.x, gate.z);
    ctx.fillStyle = '#d6f588';
    ctx.fillRect(gx - 3, gy - 3, 6, 6);
    const [x, y] = draw(physics.body.position.x, physics.body.position.z);
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(car.body.quaternion);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(f.x, -f.z));
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fillStyle = '#f3f9e5';
    ctx.shadowColor = '#122b20';
    ctx.shadowBlur = 7;
    ctx.fill();
    ctx.restore();
  }
  function updateHUD() {
    const displayed = Math.round(
      physics.speed * (save.units === 'mph' ? 2.23694 : 3.6),
    );
    $('speed').textContent = String(displayed).padStart(3, '0');
    $('units').textContent = save.units === 'mph' ? 'MPH' : 'KM/H';
    $('gear').textContent = physics.reverse ? 'R' : String(physics.gear);
    $('rpm-fill').style.width =
      `${Math.min(100, (physics.rpm / physics.spec.redline) * 100)}%`;
    $('lap-label').textContent = mode === 'practice' ? 'FREE DRIVE' : 'LAP';
    $('lap').innerHTML =
      `${String(Math.min(race.lap, mode === 'practice' ? 99 : 3)).padStart(2, '0')} <i>/ ${mode === 'practice' ? '∞' : '03'}</i>`;
    $('lap-time').textContent = formatTime(race.lapTime);
    $('lap-time').style.color = race.valid ? '' : '#f1a177';
    $('best-time').textContent = formatTime(save.bests[key()] ?? Infinity);
    $('assist-status').textContent = save.assists ? 'ASSISTS ON' : 'UNASSISTED';
    $('throttle-fill').style.width = `${lastInput.throttle * 100}%`;
    $('brake-fill').style.width = `${lastInput.brake * 100}%`;
    $('checkpoint').textContent =
      `GATE ${String(race.nextCheckpoint).padStart(2, '0')}/16`;
    const p = trackPose(race.nextCheckpoint / race.checkpointCount);
    world.gate.position.copy(p.position);
    world.gate.position.y = terrainHeight(p.position.x, p.position.z);
    world.gate.rotation.y = p.yaw;
    world.gate.visible = phase === 'driving';
    drawMap();
    const advice = drivingAdvice(
      trackInfo.progress,
      physics.speed,
      physics.spec.kind,
    );
    const coach = $('corner-coach');
    coach.classList.toggle('hidden', !save.assists || countdown > 0);
    coach.dataset.state = advice.action;
    $('corner-name').textContent =
      `${advice.corner.direction === 'RIGHT' ? '↱' : '↰'} ${advice.corner.name}`;
    $('corner-detail').textContent =
      `${advice.action} · ${Math.round(advice.corner.distance / 5) * 5} m · ${Math.round(advice.targetSpeed * (save.units === 'mph' ? 2.23694 : 3.6))} ${save.units === 'mph' ? 'mph' : 'km/h'}`;
    $('surface-status').textContent = physics.surface;
    $('surface-status').dataset.offroad = String(!physics.onRoad);
    $('g-force').textContent =
      `${Math.hypot(physics.lateralG, physics.longitudinalG).toFixed(1)} G`;
    for (let i = 0; i < 3; i++) {
      const sector = $(`sector-${i}`);
      sector.classList.toggle('active', race.sector === i);
      const time = race.sectors[i];
      sector.textContent = `S${i + 1} ${time === undefined ? '—' : Number.isFinite(time) ? time.toFixed(1) : 'INVALID'}`;
    }
    const split = race.lastSector;
    $('sector-delta').textContent = split
      ? `S${split.index + 1} ${!Number.isFinite(split.time) ? 'INVALID' : split.delta === null ? split.time.toFixed(2) + 's' : (split.delta <= 0 ? '−' : '+') + Math.abs(split.delta).toFixed(2) + 's'}`
      : 'SESSION SPLITS';
    $('sector-delta').dataset.faster = String(
      split?.delta !== null && (split?.delta ?? 1) <= 0,
    );
  }
  function start() {
    settings.close();
    controls.clear();
    sound.start();
    phase = 'driving';
    physics.reset(0.003);
    marks.clear();
    physics.assists = save.assists;
    race = new RaceState(mode);
    race.previousProgress = 0.003;
    newRecord = false;
    countdown = 3.3;
    accumulator = 0;
    cameraMode = 0;
    lastInput = emptyInput;
    autoRecoverTime = 0;
    document.body.classList.add('driving');
    visible('garage', false);
    visible('pause-screen', false);
    visible('results', false);
    visible('hud', true);
    visible('countdown', true);
    message(
      mode === 'practice'
        ? 'Take your time. Learn the road.'
        : 'Three laps. Brake early, steer smoothly.',
      5,
    );
    syncCar(true);
    updateCamera(1, true);
    updateHUD();
  }
  function pause() {
    if (phase === 'driving') {
      phase = 'paused';
      sound.update(physics.rpm, 0, 0, false);
      controls.clear();
      lastInput = emptyInput;
      visible('pause-screen', true);
      visible('countdown', false);
      $('resume').focus();
    } else if (phase === 'paused' && !settings.open) {
      resume();
    }
  }
  function resume() {
    if (phase !== 'paused') return;
    phase = 'driving';
    lastTime = performance.now();
    accumulator = 0;
    controls.clear();
    sound.start();
    visible('pause-screen', false);
    visible('countdown', countdown > 0);
  }
  function garage() {
    phase = 'garage';
    lastBrake = 0;
    sound.update(physics.rpm, 0, 0, false);
    controls.clear();
    settings.close();
    document.body.classList.remove('driving');
    visible('garage', true);
    visible('hud', false);
    visible('pause-screen', false);
    visible('results', false);
    visible('countdown', false);
    world.gate.visible = false;
    physics.reset(0);
    for (let i = 0; i < 120; i++)
      physics.update({ ...emptyInput, brake: 1, allowReverse: false }, 1 / 120);
    syncCar(true);
    updateCamera(1, true);
    $('start').focus();
  }
  function recover() {
    if (phase !== 'driving' || countdown > 0) return;
    const recoveryProgress =
      (race.nextCheckpoint - 1) / race.checkpointCount + 0.002;
    physics.reset(recoveryProgress);
    race.resetLap(recoveryProgress);
    autoRecoverTime = 0;
    message('Back on track. This lap will not count for a record.', 5);
    syncCar(true);
    updateCamera(1, true);
  }
  function finish() {
    phase = 'results';
    sound.update(physics.rpm, 0, 0, false);
    controls.clear();
    lastInput = emptyInput;
    visible('results', true);
    visible('hud', false);
    world.gate.visible = false;
    const best = Math.min(...race.times);
    const medal = !Number.isFinite(best)
      ? 'FINISHER'
      : best < trackLength / 24
        ? 'GOLD'
        : best < trackLength / 19
          ? 'SILVER'
          : best < trackLength / 14
            ? 'BRONZE'
            : 'FINISHER';
    $('medal').textContent =
      medal === 'GOLD'
        ? '★'
        : medal === 'SILVER'
          ? '✦'
          : medal === 'BRONZE'
            ? '◆'
            : '✓';
    $('result-title').innerHTML = 'COAST<br />CONQUERED.';
    $('result-subtitle').textContent = `${medal} RUN · ${physics.spec.name}`;
    $('result-times').replaceChildren();
    race.times.forEach((time, i) => {
      const row = document.createElement('div');
      const label = document.createElement('span');
      label.textContent = `LAP ${i + 1}`;
      const value = document.createElement('strong');
      value.textContent = Number.isFinite(time)
        ? formatTime(time)
        : 'RECOVERY / INVALID';
      row.append(label, value);
      $('result-times').append(row);
    });
    $('record-message').textContent = newRecord
      ? 'NEW PERSONAL BEST. THAT ONE FELT GOOD.'
      : 'Every lap teaches you something. Go again?';
    $('race-again').focus();
  }
  function action(name: string) {
    if (name === 'pause') {
      pause();
      return;
    }
    if (name === 'mute') {
      sound.muted = !sound.muted;
      $('sound-button').textContent = sound.muted ? 'SOUND OFF' : 'SOUND ON';
      $('sound-button').setAttribute(
        'aria-label',
        sound.muted ? 'Unmute sound' : 'Mute sound',
      );
      return;
    }
    if (name === 'fullscreen') {
      if (document.fullscreenElement) void document.exitFullscreen?.();
      else void document.documentElement.requestFullscreen?.().catch(() => {});
      return;
    }
    if (phase !== 'driving') return;
    if (name === 'camera') {
      cameraMode = (cameraMode + 1) % 3;
      updateCamera(1, true);
      message(['CHASE CAMERA', 'HOOD CAMERA', 'WIDE CAMERA'][cameraMode], 1.7);
    }
    if (name === 'recover') recover();
  }
  controls.onAction = action;
  const cards = $('vehicle-options');
  VEHICLES.forEach((v, i) => {
    const card = document.createElement('button');
    card.className = 'vehicle-card';
    card.setAttribute('aria-label', `Select ${v.name}`);
    card.innerHTML = `<span class="vehicle-number">0${i + 1} / ${['SPORT', 'RALLY', 'UTILITY'][i]}</span><span class="drivetrain">${v.drive}</span><h3>${v.name}</h3><p>${v.subtitle}</p><div class="vehicle-stats"><div>${v.power}<small>HP</small></div><div>${v.mass.toLocaleString()}<small>KG</small></div><div>${v.torque}<small>NM</small></div></div>`;
    card.title = v.description;
    card.addEventListener('click', () => {
      save.color = [0, 3, 1][i];
      setCar(i);
      refreshPaint();
    });
    cards.append(card);
  });
  const paintNames = [
    'Sunset orange',
    'Glacier white',
    'Forest green',
    'Atlantic blue',
    'Crimson red',
  ];
  COLORS.forEach((color, i) => {
    const button = document.createElement('button');
    button.className = 'paint';
    button.style.background = `#${color.toString(16).padStart(6, '0')}`;
    button.setAttribute('aria-label', paintNames[i]);
    button.addEventListener('click', () => {
      save.color = i;
      car.paint.color.setHex(color);
      refreshPaint();
      persist();
    });
    $('paint-options').append(button);
  });
  function refreshPaint() {
    document.querySelectorAll<HTMLButtonElement>('.paint').forEach((el, i) => {
      el.classList.toggle('active', i === save.color);
      el.setAttribute('aria-pressed', String(i === save.color));
    });
  }
  function chooseMode(value: RaceMode) {
    mode = value;
    for (const [id, m] of [
      ['mode-trial', 'time-trial'],
      ['mode-practice', 'practice'],
    ]) {
      $(id).classList.toggle('active', m === mode);
      $(id).setAttribute('aria-pressed', String(m === mode));
    }
  }
  $('mode-trial').onclick = () => chooseMode('time-trial');
  $('mode-practice').onclick = () => chooseMode('practice');
  $('start').onclick = start;
  $('restart').onclick = start;
  $('race-again').onclick = start;
  $('pause-button').onclick = pause;
  $('resume').onclick = resume;
  $('exit').onclick = garage;
  $('results-garage').onclick = garage;
  $('sound-button').onclick = () => action('mute');
  $('touch-camera').onclick = () => action('camera');
  $('touch-reset').onclick = recover;
  function openSettings() {
    if (phase === 'driving') pause();
    controls.clear();
    settings.showModal();
  }
  $('settings-open').onclick = openSettings;
  $('controls-open').onclick = openSettings;
  $('pause-settings').onclick = openSettings;
  $('settings-close').onclick = () => settings.close();
  $<HTMLInputElement>('assists').checked = save.assists;
  $<HTMLSelectElement>('quality').value = save.quality;
  $<HTMLSelectElement>('unit-select').value = save.units;
  $<HTMLInputElement>('volume').value = String(save.volume);
  $<HTMLInputElement>('touch-toggle').checked = save.touch;
  $('assists').onchange = () => {
    save.assists = $<HTMLInputElement>('assists').checked;
    physics.assists = save.assists;
    if (phase === 'paused') {
      race.valid = false;
      message('Assist setting changed. Current lap record invalidated.', 5);
    }
    persist();
  };
  $('quality').onchange = () => {
    save.quality = $<HTMLSelectElement>('quality').value as typeof save.quality;
    adaptiveScale = 1;
    lowFrameTime = 0;
    applyGraphics();
    persist();
  };
  $('unit-select').onchange = () => {
    save.units = $<HTMLSelectElement>('unit-select').value as typeof save.units;
    persist();
  };
  $('volume').oninput = () => {
    save.volume = Number($<HTMLInputElement>('volume').value);
    sound.volume = save.volume / 100;
    persist();
  };
  $('touch-toggle').onchange = () => {
    save.touch = $<HTMLInputElement>('touch-toggle').checked;
    applyTouch();
    persist();
  };
  window.addEventListener('resize', () => {
    applyGraphics();
    applyTouch();
  });
  window.addEventListener('blur', () => {
    if (phase === 'driving') pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && phase === 'driving') pause();
  });
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    if (phase === 'driving') pause();
    $('error-message').textContent =
      'The graphics connection was interrupted. Reload this page to restart. Your saved best laps are safe.';
    visible('error', true);
  });
  $('circuit-length').textContent = (trackLength / 1000).toFixed(2);
  applyGraphics();
  applyTouch();
  setCar(save.vehicle);
  refreshPaint();
  world.gate.visible = false;
  visible('loading', false);
  visible('garage', true);
  function frame(now: number) {
    requestAnimationFrame(frame);
    const wallDt = (now - lastTime) / 1000;
    const dt = Math.min(0.1, wallDt);
    lastTime = now;
    garageTime += dt;
    frameCount++;
    frameTime += wallDt;
    if (frameTime > 1) {
      fps = frameCount / frameTime;
      frameCount = 0;
      frameTime = 0;
      if (save.quality === 'auto' && fps < 27) lowFrameTime++;
      else lowFrameTime = 0;
      if (lowFrameTime >= 4 && adaptiveScale > 0.66) {
        adaptiveScale = Math.max(0.65, adaptiveScale - 0.15);
        applyGraphics();
        if (adaptiveScale < 0.8) renderer.shadowMap.enabled = false;
        lowFrameTime = 0;
      }
    }
    const input = controls.read();
    if (phase === 'driving') {
      if (countdown > 0) {
        countdown -= dt;
        const n = Math.ceil(countdown);
        $('countdown').querySelector('strong')!.textContent =
          n > 0 ? String(Math.min(3, n)) : 'GO';
        $('countdown').querySelector('span')!.textContent = 'FIND YOUR LINE';
        lastInput = { ...emptyInput, brake: 1, allowReverse: false };
        if (countdown <= 0) {
          visible('countdown', false);
          message('GO! Make this one count.', 2);
        }
      } else lastInput = input;
      accumulator += dt;
      let steps = 0;
      while (accumulator >= 1 / 120 && steps < 12) {
        physics.update(lastInput, 1 / 120);
        accumulator -= 1 / 120;
        steps++;
        if (countdown <= 0) {
          trackInfo = nearestTrack(
            physics.body.position.x,
            physics.body.position.z,
          );
          const lapCompleted = race.update(
            1 / 120,
            trackInfo.progress,
            trackInfo.distance < TRACK_WIDTH / 2 + 1.5,
          );
          if (lapCompleted) {
            const time = race.times.at(-1)!;
            if (
              Number.isFinite(time) &&
              time < (save.bests[key()] ?? Infinity)
            ) {
              save.bests[key()] = time;
              newRecord = true;
              persist();
              message(`PERSONAL BEST · ${formatTime(time)}`, 5);
            } else
              message(
                Number.isFinite(time)
                  ? `LAP ${race.lap - 1} · ${formatTime(time)}`
                  : 'Lap complete · recovery lap not ranked',
                4,
              );
            if (race.finished) {
              finish();
              break;
            }
          }
        }
      }
      if (accumulator > 0.1) accumulator = 0;
      lastBrake = lastInput.brake;
      syncCar();
      marks.update(physics);
      updateCamera(dt);
      const upsideDown =
        new THREE.Vector3(0, 1, 0).applyQuaternion(car.body.quaternion).y <
        0.25;
      autoRecoverTime =
        upsideDown || trackInfo.distance > 90 ? autoRecoverTime + dt : 0;
      if (autoRecoverTime > 3) recover();
      if (messageTime > 0) {
        messageTime -= dt;
        if (messageTime <= 0) $('race-message').textContent = '';
      }
      if (!messageTime && countdown <= 0) {
        const t = trackPose(trackInfo.progress).tangent;
        const f = new THREE.Vector3(0, 0, -1).applyQuaternion(
          car.body.quaternion,
        );
        if (physics.speed > 3 && f.dot(t) < -0.5)
          message('WRONG WAY · follow the circuit map', 1.5);
        else if (trackInfo.distance > TRACK_WIDTH / 2 + 2)
          message(
            physics.surface === 'PIT LANE'
              ? 'PIT LANE · rejoin the circuit safely.'
              : 'OFF TRACK · reduced grip. Ease back onto the road.',
            1.4,
          );
      }
    } else if (phase === 'garage') {
      updateCamera(dt);
    }
    uiTime += dt;
    if (uiTime > 0.08) {
      updateHUD();
      uiTime = 0;
    }
    sound.update(
      physics.rpm,
      lastInput.throttle,
      physics.slip,
      phase === 'driving',
    );
    world.update(garageTime);
    const groundY = terrainHeight(
      physics.body.position.x,
      physics.body.position.z,
    );
    world.shadow.position.set(
      physics.body.position.x,
      groundY + 0.06,
      physics.body.position.z,
    );
    // Follow the same local slope as the collision terrain on climbs/descents.
    const h = 0.5,
      x = physics.body.position.x,
      z = physics.body.position.z;
    const normal = new THREE.Vector3(
      terrainHeight(x - h, z) - terrainHeight(x + h, z),
      2 * h,
      terrainHeight(x, z - h) - terrainHeight(x, z + h),
    ).normalize();
    world.shadow.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal,
    );
    world.shadow.rotateZ(-Math.atan2(-forward.x, -forward.z));
    world.shadow.visible =
      physics.body.position.y - groundY < 1.4 &&
      trackInfo.distance < TRACK_WIDTH / 2 + 0.5;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  // Read-only diagnostics; no cheats or state mutation, available only on explicit debug URLs.
  if (new URLSearchParams(location.search).has('debug')) {
    Object.defineProperty(window, 'apexTelemetry', {
      value: () => ({
        phase,
        speed: physics.speed,
        signedSpeed: physics.signedSpeed,
        gear: physics.gear,
        rpm: physics.rpm,
        position: {
          x: physics.body.position.x,
          y: physics.body.position.y,
          z: physics.body.position.z,
        },
        forward: new THREE.Vector3(0, 0, -1)
          .applyQuaternion(car.body.quaternion)
          .toArray(),
        progress: trackInfo.progress,
        nextCheckpoint: race.nextCheckpoint,
        lap: race.lap,
        lapTime: race.lapTime,
        countdown,
        valid: race.valid,
        finished: race.finished,
        vehicle: physics.spec.id,
        steering: physics.steering,
        onRoad: physics.onRoad,
        surface: physics.surface,
        wheelSurfaces: [...physics.wheelSurfaces],
        lateralG: physics.lateralG,
        longitudinalG: physics.longitudinalG,
        sector: race.sector,
        sectors: [...race.sectors],
        trackId: TRACK_ID,
        slip: physics.slip,
        fps,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        mode,
        assists: save.assists,
        input: lastInput,
      }),
      writable: false,
    });
  }
}
void boot().catch((error) => {
  visible('loading', false);
  visible('error', true);
  $('error-message').textContent =
    'This game needs WebGL 2 graphics. Try an up-to-date Chrome, Edge, Firefox, or Safari with hardware acceleration enabled. If it still will not load, try another device.';
  console.error('Apex Coast initialization failed:', error);
});
