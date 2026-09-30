# Changelog

## 0.3.0 — club circuit & driving dynamics

- Replaced the flat loop with a 1.78 km graded club circuit: roughly 24 m of elevation, braking straight, named bends, linked esses, and a summit hairpin.
- Matched visible road and collision terrain; added physical apex kerbs, generous gravel runoff, distance boards, pit apron/garages/control tower and a collidable pit wall. Removed highway-style center dashes.
- Per-wheel surface grip and tire load sensitivity; grip-limited engine/brake forces, front brake bias, engine braking, progressive pedals, shift torque interruption, Ackermann steering, and force-based anti-roll bars.
- Three session-comparison sectors, advisory corner/braking guidance with assists, surface and G-load feedback, and skid marks when tires slide. Cameras and contact shadows follow grades.
- Preserved prior bests/settings; new course times use an isolated `club-v1` namespace. Still alpha. No AI opponents, pit services, ABS tire-rotation simulation, or manufacturer-validated vehicle data.

## 0.2.0 — coastal graphics pass

- Rebuilt vehicle bodies with open wheel arches, framed glazing, curved shoulders, distinct headlight treatments, detailed rims, brake discs/calipers, and rounded tires.
- CC0 photographic asphalt and coastal ground textures, including an asphalt normal map; bundled locally as optimized WebP.
- Continuous mountain ridges, detailed baked coastal trees, leafy scrub, grass tufts, limestone rocks, and a lighthouse landmark.
- Animated sea highlights and clouds, balanced warm sunlight/reflections, and a contact shadow retained on Low graphics.
- Batched road markings and instanced vegetation; reduced scene triangle cost versus the first release despite more surface detail.
- Fixed stale contact-shadow placement and brake-light state when returning to the garage.
- Same physics, controls, race rules, and versioned saves. Still alpha; real phone/tablet performance awaits device testing.

## 0.1.0 — first playable alpha

- Three distinct simulated vehicles: Vantage GT, Rally RS, Summit X.
- Original coastal circuit, rolling terrain, scenery, and procedural vehicle models.
- Real-time shadows, reflective paint/glass, and adaptive mobile rendering.
- Three-lap time trials, Free Drive, 16 ordered checkpoints, medals, results, and personal bests.
- Simultaneous touch steering/pedals, keyboard, and standard gamepad input.
- Countdown, pause/resume, restart, recovery, three cameras, and adjustable driving assists.
- Synthesized engine/tire sound with volume/mute settings.
- Local versioned saves, graphics settings, speed units, and WebGL recovery guidance.

This is the first playable release, not a completed commercial simulation. Physical phone/tablet testing and feedback from the intended player are the next validation steps.
