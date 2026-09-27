# Arcade-o-Rade contributor and agent instructions

## Scope

This is a public, multi-game studio repository. Read the root README, CONTRIBUTING.md, and the target game's DESIGN.md before changing gameplay. Mike owns product direction; never invent approved game requirements.

## Structure

- Homepage in apps/arcade; games isolated in games/<slug>.
- Keep engine decisions per game. No shared framework until real reuse exists.
- Scaffold with `npm run new:game -- <slug>`; run `npm install` to refresh the lockfile.
- Game package names are @arcade-o-rade/<slug>. Metadata lives in game.json.
- Preserve the npm build contract: output to that workspace's dist; accept `--base <path>`.
- Never use root-relative game asset URLs: the production base includes /arcade-o-rade/games/<slug>/.
- Draft games must not appear in the deployed catalog or artifact.

## Delivery

- Branch per reviewable change; PR with acceptance criteria and evidence. No direct main pushes.
- Run `npm run check` before delivery. Add meaningful tests for new behavior; don't assert implementation trivia.
- A green build is not a playtest. Verify changed gameplay with supported inputs and document remaining gaps.
- Keep release notes, asset attribution, and game docs current.
- Do not introduce placeholder games as completed products or silently advance release status.
- Do not commit personal workspace files, secrets, generated builds, or unlicensed assets.
- No analytics, accounts, paid services, multiplayer backend, or monetization without an explicit product decision.
- Ask about ambiguous product scope; resolve routine implementation details yourself.
