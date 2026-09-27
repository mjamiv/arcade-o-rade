# Arcade-o-Rade

**One studio. One arcade. Games worth finishing.**

[Play the arcade](https://mjamiv.github.io/arcade-o-rade/) · [Development workflow](CONTRIBUTING.md) · [Studio roadmap](docs/ROADMAP.md) · [Architecture](docs/ARCHITECTURE.md)

This is the shared home for every Arcade-o-Rade game: source, design, assets, playtests, and browser releases. Our first playable is **[Apex Coast](https://mjamiv.github.io/arcade-o-rade/games/apex-coast/)**: a mobile-first 3D driving alpha with three simulated vehicles, a coastal circuit, time trials, and Free Drive.

## Start locally

Use Node 24 LTS (`nvm use` if you use nvm) and npm.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open the URL Vite prints. For the full built arcade, including published games:

```sh
npm run build
npm run preview
# http://127.0.0.1:4173/arcade-o-rade/
```

## Studio map

| Location          | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `apps/arcade/`    | Public arcade homepage and catalog                         |
| `games/<slug>/`   | Independent game workspace, design, and assets             |
| `packages/`       | Shared code only when a second game actually needs it      |
| `docs/`           | Workflow, quality standards, roadmap, and decisions        |
| `docs/templates/` | Game brief, asset register, playtest, release checklist    |
| `scripts/`        | Game scaffolding, metadata validation, multi-game build    |
| `tests/`          | Browser smoke tests, including real GitHub Pages paths     |
| `.github/`        | CI, deployment, dependency updates, issue and PR templates |

## Everyday commands

| Command                                          | What it does                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `npm run dev`                                    | Develop the arcade homepage                                                    |
| `npm run new:game -- my-game`                    | Scaffold an engine-neutral TypeScript/Vite game                                |
| `npm install`                                    | Register new workspaces and update the lockfile                                |
| `npm run dev --workspace=@arcade-o-rade/my-game` | Develop a single game                                                          |
| `npm run format`                                 | Format the repository                                                          |
| `npm run check`                                  | Metadata, formatting, lint, types, unit tests, production build, browser tests |
| `npm run build`                                  | Build all workspaces; package only non-draft games into `dist/`                |
| `npm run preview`                                | Serve the complete deployment locally                                          |

The homepage dev server does not serve other workspace dev servers. Use the full build/preview to follow game links.

## Ship

Work on a branch, open a PR, pass **Quality gate**, then squash-merge to `main`. Main is the deployment source. GitHub Actions publishes the **built output only** after all checks pass. Game URLs are `/arcade-o-rade/games/<slug>/`.

New games start as `draft` and are excluded from the public artifact. Advancing `game.json` to `prototype`, `alpha`, `beta`, or `released` is an intentional publication change. Draft source is still visible because this is a public repository.

## Ownership

No open-source license has been selected. Public source visibility does not itself grant a license. Original code and assets remain with their respective owners; third-party license terms are tracked in each game's `ASSETS.md`. See [asset policy](docs/ASSETS.md).
