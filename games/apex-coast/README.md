# Apex Coast

**Three machines. One coastal circuit. Find your drive.**

A mobile-first 3D racer built for phones, tablets, and desktop browsers. **Version 0.3.0 — alpha.**

[Play Apex Coast](https://mjamiv.github.io/arcade-o-rade/games/apex-coast/) · [Design](DESIGN.md) · [Asset register](ASSETS.md) · [Playtest evidence](PLAYTEST.md)

## Play

Choose the Vantage GT (rear-wheel drive), Rally RS (all-wheel drive), or Summit X pickup (four-wheel drive). Pick a paint color, then race three laps against the clock or explore in Free Drive. Best laps save on this browser, separately by car and assist mode. The 1.78 km club circuit climbs approximately 24 m and has 16 ordered gates; recovering invalidates the current lap.

Phones/tablets: hold the left/right steering buttons and GAS together. BRAKE slows the car; keep holding at a stop to reverse. CAM cycles chase, hood, and wide views. The circular-arrow button recovers to the last checkpoint. With assists on, named corner cards show direction, distance, and an advisory entry speed; BRAKE is a suggestion, not automatic braking. Three sector splits compare against your session bests. Both portrait and landscape work; landscape offers a wider view. Settings include assists, volume, graphics, and speed units.

Desktop: WASD/arrows drive; Space handbrakes; C changes camera; R recovers; Escape/P pauses; M mutes; F requests fullscreen. A standard gamepad uses left stick, RT/LT, A handbrake, B recovery, Y camera, and Start pause. Physical controller compatibility is not yet device-verified.

## Simulation, honestly described

The vehicles use cannon-es rigid-body dynamics and four raycast suspension wheels, not scripted position animation. They have different masses, torque/gearing, suspension, steering, drivetrains, braking forces, drag, and grip. Each tire independently samples asphalt, kerbs, runoff, grass, and the pit lane. Tire-load-limited propulsion/braking, front brake bias, engine braking, progressive pedals, Ackermann steering, and force-based anti-roll bars make braking and cornering more demanding. Guardrails, low raised kerbs, the pit wall, and graded terrain have collision geometry. Driving assists smooth steering and reduce power during excessive lateral slip. An automatic transmission handles gears.

These are fictional, game-tuned vehicles. This is **not** an engineering-validated manufacturer simulator: no Pacejka tire model, thermal simulation, deformable damage, or exact drivetrain compliance. Power figures are fictional design specifications, not measured dyno results. Vehicle geometry is original procedural 3D, with physical materials and lighting; road/ground surfaces use attributed CC0 photo textures. No licensed real-car scans are included.

## Develop

From the repository root:

```sh
npm ci
npm run dev --workspace=@arcade-o-rade/apex-coast
npm run check
```

Root build and preview reproduce the real Pages path. `?debug` adds a read-only `window.apexTelemetry()` function for test instrumentation; it does not grant state mutation or cheats.

## Architecture

- `physics.ts` / `vehicles.ts`: fixed-step 120 Hz vehicle simulation and tuning.
- `track.ts` / `terrain.ts` / `world.ts` / `scenery.ts`: track geometry, terrain, scenery, lighting.
- `car-model.ts`: original procedural vehicle models, merged by material to limit draw calls.
- `circuit.ts` / `trackside.ts`: shared obstacle geometry, pit facilities and corner/braking boards.
- `driving-advice.ts` / `tire-marks.ts`: advisory corner feedback and bounded slip-mark rendering.
- `race.ts`: ordered checkpoint validation, lap/sector timing, and race completion.
- `input.ts`: simultaneous touch, keyboard, and standard gamepad inputs.
- `audio.ts`: synthesized engine and tire sounds; initiated only by a user action.
- `save.ts`: versioned, validated, failure-tolerant browser storage.
- `main.ts`: state transitions, cameras, HUD, garage, settings, and adaptive rendering.

## Release boundaries

No accounts, network gameplay, analytics, purchases, downloaded car models, or runtime CDN dependencies. Saves do not sync between devices. Old flat-course records remain saved; the new circuit has separate `club-v1` records. Session sector bests reset when starting another session. The pit lane is drivable scenery, not a pit-service game mode. WebGL 2 is required. Mobile emulation is not a substitute for testing the actual phone/tablet; use Low graphics if needed. AI opponents, additional tracks, licensed vehicles, and physical steering-wheel support are future scope, not shipped features.
