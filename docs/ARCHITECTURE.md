# Architecture

## Decisions

- npm workspaces; Node 24 LTS is the CI baseline.
- TypeScript + Vite is the lightweight web foundation. The studio does not mandate a game engine.
- Static GitHub Pages hosting: no server processes, private API secrets, or authoritative multiplayer backend.
- Homepage at `/arcade-o-rade/`; independently bundled games at `/arcade-o-rade/games/<slug>/`.
- No SPA router required. Each game has its own index.html so deep links survive a refresh.
- Catalog generated from validated game.json manifests; no hand-maintained second list.
- Build all games, package only non-drafts. Publishing means changing status deliberately in a PR.
- No service worker at foundation stage; avoid stale-cache deployment surprises.

```text
apps/arcade ── build ──> dist/index.html + catalog.json
                           │
games/<slug> ─ build ──> dist/games/<slug>/ (unless draft)
                           │
                       Pages artifact ──> GitHub Pages
```

## Game contract

Required metadata: slug (folder-matching kebab-case), title, description, status, controls. Allowed statuses: draft, prototype, alpha, beta, released. Allowed controls: keyboard, mouse, touch, gamepad. Declare only inputs the game supports.

A game is a named npm workspace with build and typecheck scripts plus README.md, DESIGN.md, and ASSETS.md. Its build accepts `--base` and writes to its own `dist/`. A future Godot or other exporter can use an adapter matching this contract; do not pretend the current Vite scaffold is an engine export adapter.

For bundled assets prefer imports or `new URL('./asset.png', import.meta.url)`. For public assets use `import.meta.env.BASE_URL`. Scope storage keys by game and schema version, for example `arcade-o-rade:moon-run:save:v1`. All games share the same origin: local storage is not a security boundary.

Local saves stay in that browser/device; Pages access from anywhere does **not** mean cross-device cloud saves. Cloud saves, server multiplayer, leaderboards with anti-cheat, and accounts need a separately designed backend.

The homepage currently uses Google Fonts with local system fallbacks. No analytics or tracking SDK is installed. For offline play or stricter asset ownership, self-host the licensed font files and document them.

## Scaling deliberately

Choose Canvas, Phaser, Three.js, or another engine per game's actual needs. Extract shared packages only after reuse exists. Keep large editable art/audio sources outside normal Git and commit optimized exports plus provenance. Record consequential changes in docs/decisions/.
