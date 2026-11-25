---
id: spine-framework:0035-shared-domain-code
title: custom/shared/ assembles into both the frontend and function trees — pure domain logic gets one physical home
status: accepted
kind: decision
owner: package
since: 0.10.2
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - scripts/assemble-frontend.sh
  - scripts/assemble-functions.sh
  - .framework/src/instructions/guide/02-project-map.md
enforced_by:
  - .framework/tests/unit/assemble-shared.test.ts
evidence:
  - { kind: report, ref: "downstream project build review 2026-11-25: a pure pricing engine needed identical math in the artist-facing preview and the server-side verification path; with no shared location the project wrote a hand-rolled sync script copying the engine between two trees", label: observed }
provenance: captured
---

## Context

Frontend sources assemble to `.assembled/src`; functions assemble to
`.assembled/netlify/functions` (with `custom/functions/_shared` overlaying
core `_shared`). `@core` is frontend-only; `_shared` is functions-only.
Pure domain code — calculations, state machines, validators that must be
identical on both sides of the wire — had no physical home reachable by
both trees.

## Decision

`custom/shared/` is a project-owned directory assembled into **both**
targets: `custom/shared/<mod>.ts` lands at
`.assembled/src/shared/<mod>.ts` and
`.assembled/netlify/functions/_shared/shared/<mod>.ts`.

- Frontend imports `@shared/<mod>` (alias added alongside `@core`).
- Functions import `./_shared/shared/<mod>` — the existing `_shared`
  resolution path, unchanged.
- The directory is project-owned (never framework-shipped); framework
  code never imports it.

## Alternatives rejected

- **Sync script per project**: works, is invisible to `verify`, and
  every project re-invents it — the downstream build's own words: "the
  copy is generated, never hand-edited." A convention every project
  needs is a framework concern.
- **Publish domain logic inside the app package only**: solves
  frontend reuse, not the function side.

## Consequences

- `verify` learns the generated path (both copies trace to
  `custom/shared/`); stale sync-script hacks have a documented
  replacement.
- `guide/02-project-map.md` documents the directory.
