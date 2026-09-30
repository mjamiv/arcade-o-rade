# First-playable verification

## Test environment

Local Apple M4 Mac; Google Chrome using the Metal graphics backend. Chromium automated tests use desktop and mobile viewport/touch emulation. No physical phone, tablet, gamepad, or steering wheel was available to certify hardware compatibility. No claim of physical-device battery/thermal testing.

## Verified behavior

- Suspension settles on all four wheels for all three vehicles.
- Different vehicle masses/drivetrains produce different acceleration; braking slows each vehicle and deliberate held-brake input selects reverse.
- Countdown/garage braking cannot engage reverse.
- A collision barrier stops the chassis from crossing its geometry.
- Each car completes a valid three-lap circuit using a steering/throttle controller in the actual physics engine (no position teleportation).
- Ordered checkpoint state rejects reverse-driving/shortcut lap credit; recovery invalidates the current lap.
- Save parser tolerates corrupt data and filters invalid best-time values.
- Touch steering and throttle work simultaneously; releasing contacts clears input.
- Pause/resume, camera selection, recovery, vehicle selection, settings, and portrait/landscape layouts exercised in the browser.
- Screenshots actually inspected on desktop and mobile layouts; rendering errors fixed before release.

## Performance observations

On the M4 with Chrome/Metal, mobile-emulated portrait/landscape samples were approximately 55–75 FPS. This is an observation on desktop hardware, **not** a phone benchmark. Balanced mobile rendering caps device pixel ratio at 1 and shadow maps at 1024; sustained low frame rates reduce resolution, then disable shadows. Low graphics is available explicitly.

The physics engine uses a fixed 120 Hz step with bounded catch-up. The vehicle geometry is procedural; version 0.2.0 adds compact, self-hosted CC0 surface textures and baked foliage. No large model pack is loaded at runtime. Actual built sizes are recorded in the release verification.

## Known limitations / next playtest

- Actual iPhone/iPad/Android browser performance, thermal behavior, screen safe areas, and audio permissions need real-device playtests.
- Safari/Firefox and physical gamepads have not been certified.
- Cars and scenery are original procedural assets, not photoreal scans. Further art polish is expected.
- Tire/engine models are simplified and game-tuned, not engineering-validated.
- No AI opponents; this release is time trial plus Free Drive.
- Best times remain local to a browser, and clearing browser data removes them.

## Complete browser race

A hardware-accelerated Chrome run completed a full three-lap race through the normal input adapter using a virtual standard gamepad (steering and pedals, no position changes or race-state injection). The results screen showed **1:34.108 / 1:32.192 / 1:32.192**, awarded Bronze, and stored `vantage-assisted: 92.1916666666861` in the versioned save. No uncaught browser errors were recorded. Results rendering was screenshot-inspected. This verifies the gamepad input path, not a physical controller device.

## Build and automated suite

The production build is approximately **808 KB on disk** before notices, with its main JavaScript bundle **699 KB minified / 186 KB gzip**, CSS approximately 20 KB / 5 KB gzip, and bundled Latin fonts. This fits the initial 1 MB source-asset delivery budget; browsers fetch their supported font format, not both fallback formats. The large-chunk advisory is expected for the single Three.js + physics runtime, not an unmeasured asset download.

10 unit/integration tests and 12 browser scenarios passed locally. Two platform-specific scenarios intentionally skip the irrelevant project (keyboard case on mobile; multitouch case on desktop). The tests include the root studio deployment fixture and arcade integration.

GitHub's GPU-less runner initially timed out on two concurrent desktop rendering scenarios. CI now serializes browser sessions and uses a 960×540 desktop viewport; mobile touch coverage and all behavioral assertions remain unchanged. A full local run with the same software-rendering CI configuration passed, including all 12 browser scenarios in 46 seconds.

## 0.2.0 coastal graphics verification — September 29, 2026

- Resumed and completed the coastal-art branch: three detailed car bodies, photographic asphalt/ground, baked trees, continuous ridgelines, animated water/clouds, and low-quality contact shadows.
- Hardware-accelerated Google Chrome/Metal on Apple M4: inspected fresh garage screenshots for all three vehicles, desktop chase driving, and touch portrait (390×844) / landscape (844×390). Steering and throttle were delivered as simultaneous browser touch contacts, then released; pause/resume and rotation were exercised.
- Observed desktop driving at approximately 75 FPS, with 145 draw calls and 243,102 triangles. Mobile-emulated samples ranged approximately 57–75 FPS. These are desktop-host observations, not physical-phone benchmarks.
- Built game footprint is approximately 1.61 MB (including bundled textures, fonts, and notices), within the revised 2 MB budget. Main JavaScript is 711.77 KB minified / 189.85 KB gzip.
- No console errors or uncaught exceptions during the vehicle and driving inspections. All four texture files are bundled; no external texture service is needed at runtime.
- Refreshed road proximity on resets/garage transitions, preventing stale contact-shadow visibility; returning to the garage also clears brake-light state. Added browser regression coverage for garage road-position state after recovery.
- Full quality gate: 10 unit/integration tests and 12 browser scenarios, with two intentional platform skips. Physics, lap validation, saved records, and release status remain unchanged.
- Physical iPhone/iPad/Android, Safari/Firefox, and hardware controller verification remain outstanding. This branch is review-ready, not evidence of a new live deployment.

## 0.3.0 club circuit & dynamics — September 29, 2026

### Course and handling

- New course measured at 1,779.64 m, with approximately 24 m of elevation and a maximum centerline grade around 10%. Road surfaces use the same heightfield triangle interpolation as wheel collisions. Kerbs and the pit wall are physical obstacles.
- All three cars completed valid three-lap runs in the actual physics engine, with the new guardrails and kerbs active. The test controller only sends steering and pedals; no position or checkpoint mutation. Increased the simulation budget for the longer course (450 s, previously 330 s).
- Tests verify four-wheel contact and collision/visual height agreement at six climb/descent positions, per-wheel mixed-surface grip, raised kerb collision, sector sums/deltas and invalidation, advisory braking, and preservation/isolation of old/new records.
- Controlled dry-road braking test from 100 km/h: GT approximately 30.35 m, rally 32.29 m, pickup 38.43 m. These are game-model measurements, not manufacturer specifications or real-car validation.

### Browser and rendering

- Inspected desktop garage/driving and touch portrait/landscape screenshots on Chrome/Metal (Apple M4). Simultaneous steering/throttle, release, pause/resume, camera/recovery, and rotation exercised. Landscape timing-panel spacing was tightened after inspection to avoid sector-strip overlap.
- Inspected on-track summit and downhill screenshots during a full physically driven browser lap through the standard-gamepad input adapter. Climbing/descending stays grounded; sector 1 recorded 46.05 s in that run. Virtual gamepad only; no physical controller certification.
- Observed approximately 59–75 FPS in desktop samples and 56–75 FPS in desktop-host mobile emulation; course screenshots around 432–434k rendered triangles, with draw calls varying by view. Not a phone benchmark. Physical phone/tablet and Safari/Firefox checks remain outstanding.
- Fixed-budget skid-mark ring buffer (1,024 segments), one draw call, no unbounded trail growth. Nearby static collision activation uses an 80 m margin plus obstacle radius and refreshes every 0.2 s; it is independent of camera visibility.
- Built game approximately 1.62 MB including textures/fonts/notices. Main JS 721.21 KB minified / 193.53 KB gzip; CSS 21.68 KB. Still within the 2 MB built-output budget.
- `npm run check` passed: 16 unit/integration tests and 12 browser scenarios (2 intentional platform skips), formatting, lint, types, production nested-path build. Browser coverage includes assisted corner/sector/surface HUD and hidden guidance in unassisted Free Drive.

### Scope and save compatibility

- Alpha status retained. No AI rivals, weather, pit-service simulation, or fully rotational tire/ABS model was added.
- The existing version-1 save and settings remain readable. New records are keyed under `club-v1`; prior flat-course records stay stored but are not compared to the new track. Sector bests last for the session only.
- Prepared as a follow-up to the coastal graphics branch. Review/CI status is recorded on the pull request; these local results do not imply deployment.
