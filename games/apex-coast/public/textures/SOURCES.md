# Surface texture provenance

Surface creator: Rob Tuytel. Tree creator: Rico Cilliers. Source: Poly Haven. License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); [provider policy](https://polyhaven.com/license). Retrieved 2026-09-28. Optimized runtime files are committed; originals remain downloadable from the sources below. Color textures are sRGB; the OpenGL normal texture is non-color data.

## asphalt-color.webp

- Original: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_02/asphalt_02_diff_1k.jpg
- Original SHA-256: `1aa5ce99f58a625c71d48cfc3e68b65ca85ccb00f39e045c0a928608a0ea25ed`
- Processing: `cwebp -q 82` (compression/resizing only).
- Runtime SHA-256: `b577ded38f36b05bbe5eebf526b8b18835510c964ead55b0d77b204a07f0257c`

## asphalt-normal.webp

- Original: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_02/asphalt_02_nor_gl_1k.jpg
- Original SHA-256: `42a1c381b53204e83a982db2864479a30bc127bbdeebb1006f8ee51bff099df3`
- Processing: `cwebp -q 88 -resize 512 512` (compression/resizing only).
- Runtime SHA-256: `8abd6ad19b40ef3df3bd11c233c510d254b6af9252b0f0903cf029e28e630720`

## coastal-ground.webp

- Original: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_grass_rock/aerial_grass_rock_diff_1k.jpg
- Original SHA-256: `57b8041bfe0d0f01430e4dbaad45e7ddddf0a9fc97317f90dbc51f7b0d9e1b5d`
- Processing: `cwebp -q 82` (compression/resizing only).
- Runtime SHA-256: `d08b0fc72726f778bb2cfb79d7ee950c5d7beaa1e7a991633a4492cdafc228d5`

## coastal-tree.webp

- Original: [Tree Small 02](https://polyhaven.com/a/tree_small_02), created by Rico Cilliers, CC0 1.0.
- Source descriptor: https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/tree_small_02/tree_small_02_1k.gltf
- Source geometry: https://dl.polyhaven.org/file/ph-assets/Models/gltf/8k/tree_small_02/tree_small_02.bin
- Source texture list: https://api.polyhaven.com/files/tree_small_02 (the 1K glTF includes).
- Derived asset: original source model rendered with Three.js 0.186.1 to a 512×768 transparent PNG, then `cwebp -q 88 -alpha_q 95`. The 95 MB source geometry and source texture pack are **not shipped**.
- Bake: centered model with base at Y=0; orthographic camera at (0, height/2, 50), looking at (0, height/2, 0); vertical coverage `max(height × 1.08, width × 1.08 × 1.5)`, horizontal coverage 2/3 of vertical. ACES exposure 0.95, hemisphere sky #d9eaff/ground #6b6644 at 2.6, directional #fff1d3 at 1.8 from (-10,20,10), transparent background.
- Runtime: depth-writing, alpha-tested camera-facing instanced cards with color/scale variation. Shrubs reuse the upper portion. Baked foliage lighting is a deliberate mobile tradeoff; these are not volumetric, wind-simulated trees.
- Source geometry SHA-256: `8da6c3c389ad8748286d1b7488cd827f75ebdad9d8f59ef7dfb0916df5edc634`
- Runtime SHA-256: `8448913080b23654b57c4a5af4a981cd34c943a522803d87597f798138269bef`
