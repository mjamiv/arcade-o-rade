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
