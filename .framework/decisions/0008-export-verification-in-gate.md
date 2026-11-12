---
id: spine-framework:0008-export-verification-in-gate
title: Standalone export + bundling is verified in the release gate, not discovered downstream
status: accepted
kind: decision
owner: package
since: 0.5.5
until: null
supersedes: null
superseded_by: null
links:
  - spine-framework:0002-assembler-import-stubs
  - spine-framework:0004-inbound-module-loaders
applies_to:
  - scripts/verify-exports.ts
  - package.json
  - .devin/skills/release/SKILL.md
enforced_by:
  - scripts/verify-exports.ts
evidence:
  - { kind: commit, ref: 7d9f1d5 }
  - { kind: commit, ref: 81f7461 }
provenance: captured
---

## Context

The `7d9f1d5` release reached production with broken standalone exports —
`webhook-registry.ts` dynamic imports could not resolve for apps that
didn't ship those modules, and AO's `file_map` referenced a `LICENSE.md`
that wasn't in the repo. Both were only discovered during downstream
release work.

## Decision

`npm run gate` includes `verify:exports`: every `standalone.config.json`
profile is exported to a temp dir, `assemble-functions.sh` runs, and each
assembled `.ts` function is bundled with esbuild. Any failure fails the
gate. The release skill runs the gate at Gate 0 before downstream export.

## Alternatives rejected

- Verifying only AO — the failure mode is per-app; demo hit the same
  bundling regression.
- Bundling without exporting — misses `file_map`/missing-source failures
  like the LICENSE.md bug (a file that existed locally but was never
  committed).

## Consequences

- `esbuild` is a direct devDependency (the check uses its JS API).
- The LICENSE.md reproducibility bug was fixed by un-ignoring and
  committing `custom/apps/answer-once/LICENSE.md` — `file_map` must only
  reference tracked files.
