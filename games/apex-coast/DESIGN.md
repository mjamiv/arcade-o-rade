# Apex Coast — first playable

## Confirmed direction

Mike requested an engaging racing game for his son, realistic-looking graphics, real physics, and multiple vehicles that behave differently. Browser delivery through Arcade-o-Rade is already established.

## Implementation assumptions (open to revision)

Working name: **Apex Coast**. Original unbranded vehicles; scenic coastal circuit; time-trial championship (three laps) and unrestricted practice; no combat, purchases, ads, or accounts. Three vehicle classes: lightweight rear-drive GT, all-wheel-drive rally hatch, and heavier four-wheel-drive pickup. Keyboard, gamepad, and multitouch controls. Adjustable assists default on. Mike confirmed phone/tablet as the primary device and supplied no favorite vehicles or games. Age is unspecified; no age is assumed.

## Core loop

Choose a vehicle and driving mode, learn the circuit in practice or start a three-lap time trial, pass sequential checkpoints, improve lap times, finish, see results and a medal, retry or change vehicles. Best times persist locally per vehicle/assist setting. Resetting to track invalidates the current lap; shortcuts do not award a valid lap.

## Physics and rendering

Three.js rendering and cannon-es rigid-body raycast vehicle simulation. Fixed 120 Hz steps; four independent suspension rays, chassis inertia, normal-load-limited lateral friction, driven wheels, brakes, aerodynamic drag, downforce, and speed-sensitive steering. Different masses, drivetrains, torque curves, wheelbases, suspension, and center of mass. Automatic gearbox. Grass reduces grip and increases rolling resistance. Chassis and guardrails collide.

This is a game-tuned simulation, not an engineering-validated reproduction of manufacturer vehicles, a full deformable tire model, or a commercial racing simulator equivalent. Vehicle names and figures are fictional.

## Visual and audio direction

Coastal afternoon, continuous sunlit ridges, animated ocean/clouds, physically based vehicle materials, original procedural car models with framed glazing and open arches, shadows, leafy roadside vegetation and circuit furniture. CC0 photographic asphalt/ground surface maps add detail; they are compressed and self-hosted. Garage-style vehicle selection and restrained motorsport HUD. Procedural engine audio responds to RPM/load; tire scrub responds to slip; all sound user-initiated and mutable.

## First-version acceptance criteria

- Three selectable vehicles with demonstrably different acceleration and handling parameters.
- Vehicle motion emerges from rigid-body forces and suspension, not direct position animation.
- Responsive driving, braking/reverse, handbrake, camera switching, pause/resume, restart, and recovery.
- Countdown, ordered checkpoint/lap validation, finish screen, and local best-time persistence.
- Touch controls work with simultaneous steering and pedals; keyboard and standard gamepad supported.
- Live deployment works at its nested Pages URL with no required external runtime assets.
- Automated physics/race-state and browser start/drive/pause tests; manual graphical/input inspection.

## Performance targets and limitations

Primary target: phones and tablets, aiming for 30 FPS with adaptive resolution and low/balanced graphics. Desktop target 60 FPS on the local Apple M4. The graphics pass allows up to 2 MB of uncompressed built output (including code/fonts/textures); this supersedes the initial 1 MB source-asset target. No heavy post-processing or realtime reflection render targets. Actual phones/tablets still need device playtests. Shadows and pixel ratio selectable. Modern WebGL2 required; unsupported devices get a clear message rather than a blank page. Chromium desktop/mobile emulation is the initial tested matrix; Safari, Firefox, and physical controller coverage must be reported honestly.

## Deferred

AI opponents, multiplayer, licensed vehicle brands, damage/deformation, tuning shop, additional tracks, wheel/pedal hardware support, cloud saves, weather, and engineering validation. No claim these exist in this first playable.
