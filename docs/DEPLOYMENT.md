# Deployment and operations

## Production

- Repository: https://github.com/mjamiv/arcade-o-rade
- Arcade: https://mjamiv.github.io/arcade-o-rade/
- Workflow: `.github/workflows/ci.yml`
- Pages source: GitHub Actions, not direct publishing of repository files.

PRs run Quality gate without deployment credentials. Pushes to main run the same checks, upload dist as the Pages artifact, then deploy through the github-pages environment. The publish job has only pages:write and id-token:write beyond the default read scope. Deployments are serialized.

`npm run build && npm run preview` reproduces the deployment prefix locally. Never deploy the repo root, node_modules, source asset archives, or credentials. Browser bundles are public, including any values injected at build time.

## Publishing a game

1. Complete the release checklist and playtest evidence.
2. Set game.json status from draft to the honest public stage (prototype/alpha/beta/released).
3. Run npm run check and review the full built arcade.
4. Merge the PR; wait for the Pages deployment to succeed.
5. Open the live game URL, hard-refresh, test start/restart/audio/save as applicable, and confirm no missing assets or console errors.
6. Record the deployed commit and tag the release.

## Rollback

Revert the problematic change in a new branch/PR, run checks, merge, and let Pages redeploy. Use a known-good commit's files, not a force-push of main. Restoring code cannot automatically undo a destructive save migration; migrations must be backwards-aware and tested separately. In an outage, an admin can re-run the last known-good workflow while preparing the permanent revert.

## Maintenance

Dependabot proposes weekly npm and Actions updates. Review and test; no auto-merge. Keep CI and local Node aligned with .nvmrc. If the repository name changes, update the base in scripts/studio.mjs, preview command, Playwright config, tests, and links together.
