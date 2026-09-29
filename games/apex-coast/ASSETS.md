# Apex Coast asset register

Vehicle/scenery geometry, sounds, UI, and marks are original code-authored work; distant foliage uses an optimized bake from a CC0 model by Rico Cilliers. Road and ground textures are CC0 photographs by Rob Tuytel via Poly Haven; the font is openly licensed. No licensed car brands, scraped models, or stock music are used.

| Shipped paths / source                                                 | Creator / origin                                                        | License / ownership basis                                                    | Notes                                                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/car-model.ts`, `src/world.ts`, `src/terrain.ts`, `src/scenery.ts` | Original procedural models and textures for Arcade-o-Rade               | Repository owner's original project work; no public project license selected | Fictional cars, circuit, landscape, vegetation, sky setup, signage           |
| `src/audio.ts`                                                         | Original Web Audio synthesis                                            | Repository owner's original project work                                     | RPM/load-driven oscillators and generated filtered tire noise; no recordings |
| `src/style.css`, `index.html`, `public/favicon.svg`                    | Original UI / code-authored vector mark                                 | Repository owner's original project work                                     | No real manufacturer logo or endorsement                                     |
| Barlow Condensed Latin 700/800 font files, bundled by Vite             | Jeremy Tribby / Barlow contributors, via `@fontsource/barlow-condensed` | SIL Open Font License 1.1                                                    | Self-hosted with the game; license retained in third-party notices           |
| Three.js and bundled Sky / RoundedBox / geometry utilities             | Three.js contributors                                                   | MIT                                                                          | npm `three`; attribution retained in third-party notices                     |
| cannon-es                                                              | cannon-es contributors; based on cannon.js                              | MIT                                                                          | npm `cannon-es`; attribution retained in third-party notices                 |

See `public/THIRD-PARTY-NOTICES.txt` for shipped license text. npm lockfile records exact library versions. Type declarations and build tools are development dependencies, not separate game artwork.

## Photographic surface textures (0.2.0)

All four runtime WebP textures in `public/textures/` derive from Rob Tuytel's surface textures and Rico Cilliers' tree model on Poly Haven, licensed [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Poly Haven [confirms CC0 for its assets](https://polyhaven.com/license). No attribution is legally required, but origin and processing are recorded in [texture provenance](public/textures/SOURCES.md). No runtime requests to Poly Haven are made.

- [Asphalt 02](https://polyhaven.com/a/asphalt_02): 1K diffuse → 1K WebP quality 82; OpenGL normal → 512px WebP quality 88.
- [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock): 1K diffuse → 1K WebP quality 82.
- Combined optimized texture payload approximately 754 KiB. No stock car models or copyrighted manufacturer marks.

- [Tree Small 02](https://polyhaven.com/a/tree_small_02), Rico Cilliers: CC0 model baked to a 512×768 alpha-cutout WebP. The original large model is not shipped. Camera/light settings and hashes are in the provenance record.
