# Asset and IP policy

Every game maintains ASSETS.md. Record original, generated, commissioned, and third-party assets: creator/tool, original source, license or ownership basis, modifications, attribution, and shipped file paths. Generated art still needs provenance and human review; do not assume an image generator grants rights to depicted brands or characters.

Commit optimized runtime files beside the game. Keep editable masters, huge audio sessions, and render caches outside ordinary Git; record where masters live without publishing private locations or credentials. Decide Git LFS or external asset storage when there is a real need, with Pages build support verified first. Never add a huge binary just because Git accepts it.

Prefer small, compressed exports. Establish a download budget during game design. Check filenames for case sensitivity: Linux CI and Pages can expose errors hidden on a Mac.

## Studio asset register

| Asset                                              | Origin                                            | Rights / license                              | Notes                                                                                              |
| -------------------------------------------------- | ------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Homepage cabinet illustration, favicon, and layout | Original code-created CSS/SVG for this repository | Repository owners; no public license selected | No downloaded illustration                                                                         |
| DM Sans / Barlow Condensed                         | Google Fonts; upstream font families              | SIL Open Font License 1.1                     | Currently loaded from Google Fonts with system fallbacks; retain upstream licenses if self-hosting |

No general repository license is selected on the owner's behalf. Third-party dependency licenses remain applicable independently of that choice.
