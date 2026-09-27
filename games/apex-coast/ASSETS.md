# Apex Coast asset register

All geometry, textures, sounds, UI, and marks are created in code for this project except the openly licensed font. No licensed car brands, scraped models, or stock music are used.

| Shipped paths / source                                     | Creator / origin                                                        | License / ownership basis                                                    | Notes                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/car-model.ts`, `src/world.ts`, `src/terrain.ts`       | Original procedural models and textures for Arcade-o-Rade               | Repository owner's original project work; no public project license selected | Fictional cars, circuit, landscape, vegetation, sky setup, signage           |
| `src/audio.ts`                                             | Original Web Audio synthesis                                            | Repository owner's original project work                                     | RPM/load-driven oscillators and generated filtered tire noise; no recordings |
| `src/style.css`, `index.html`, `public/favicon.svg`        | Original UI / code-authored vector mark                                 | Repository owner's original project work                                     | No real manufacturer logo or endorsement                                     |
| Barlow Condensed Latin 700/800 font files, bundled by Vite | Jeremy Tribby / Barlow contributors, via `@fontsource/barlow-condensed` | SIL Open Font License 1.1                                                    | Self-hosted with the game; license retained in third-party notices           |
| Three.js and bundled Sky / RoundedBox / geometry utilities | Three.js contributors                                                   | MIT                                                                          | npm `three`; attribution retained in third-party notices                     |
| cannon-es                                                  | cannon-es contributors; based on cannon.js                              | MIT                                                                          | npm `cannon-es`; attribution retained in third-party notices                 |

See `public/THIRD-PARTY-NOTICES.txt` for shipped license text. npm lockfile records exact library versions. Type declarations and build tools are development dependencies, not separate game artwork.
