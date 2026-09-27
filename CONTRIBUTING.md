# How the studio works

## From idea to release

1. **Brief:** Fill out the game's DESIGN.md with Mike. Agree on audience, core loop, controls, art direction, and explicit non-goals.
2. **Vertical slice:** One small, playable end-to-end experience. Validate fun, controls, and technical feasibility before adding content.
3. **Production:** GitHub issues define reviewable tasks with acceptance criteria. Use milestones per game/release; labels identify work type and priority.
4. **Playtest:** Record real findings using the playtest template. Fix progression blockers and save-loss bugs before polish.
5. **Release candidate:** Complete the definition of done and release checklist, including asset rights and performance measurements.
6. **Ship and observe:** Merge a checked PR, verify the live Pages URL, tag the release, and record known issues.

## Branches and reviews

- Use `feat/<game>-<change>`, `fix/<game>-<bug>`, or `chore/<change>`.
- Small PRs. Link the issue and state the acceptance criteria.
- Squash-merge after Quality gate passes; resolve review threads.
- Solo work does not need a second person's approval, but it still needs a PR and test evidence.
- No force pushes or deletion of main. Never bypass checks to make a release look green.
- Update package-lock.json for dependency and workspace changes; CI uses npm ci.

## Issue organization

Use `type:feature`, `type:bug`, `type:chore`, `type:design`; use `priority:p0` only for outages/save loss, `priority:p1` for blockers, and `priority:p2` for normal work. Add game-specific labels only when the game exists. Issues are the source of truth for task status; docs/ROADMAP.md holds milestones, not a duplicate ticket list.

## Daily development

Run `npm ci` after pulling dependency changes. Develop a workspace with Vite. Format before opening a PR. `npm run check` is the same gate used by CI. Install Chromium with `npx playwright install chromium` once locally (again when Playwright updates).

For game-specific tests, place browser tests under tests/<slug>/ and unit tests under scripts/ or extend the root test command to include a game's suite. Each playable game must add smoke coverage that starts gameplay, not merely checks its title.

## Releases and recovery

See [deployment](docs/DEPLOYMENT.md). Use per-game tags such as `my-game/v0.1.0` and studio tags such as `studio/v0.1.0`. Document player-facing changes in the game's CHANGELOG.md starting with its first playable release. Never publish a draft or introduce a save migration as an incidental cleanup.
