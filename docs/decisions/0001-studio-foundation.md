# 0001 — Multi-game static web studio

Status: accepted for the studio foundation

## Context

Arcade-o-Rade is one repository and one GitHub Pages home for multiple future games. The first game's requirements are not yet defined.

## Decision

Use npm workspaces, TypeScript/Vite web scaffolds, independent per-game builds, and an automatically generated catalog. Keep game engines undecided. Require a pull request and automated quality gate before deploying main. Exclude draft builds from the public site.

## Consequences

Low setup overhead and stable per-game URLs. No backend services or cross-device save sync come with Pages. Non-Vite engines will need a build-contract adapter. Shared code is extracted when needed, not speculatively. Public source and public hosted gameplay are distinct: draft source remains public.
