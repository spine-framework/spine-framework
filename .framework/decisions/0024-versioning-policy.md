---
id: spine-framework:0024-versioning-policy
title: versioning policy — what minor/patch means for consumers
status: accepted
kind: decision
owner: package
since: 0.7.0
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - package.json
  - .framework/src/instructions/operations/versioning.md
  - .framework/cli/commands/upgrade.ts
enforced_by: []
evidence:
  - { kind: doc, ref: "Owner direction, developer-lifecycle plan 2026-11-16 (S10 + Evolve stage): publish version/compatibility policy so consumers can plan upgrades", label: source }
  - { kind: doc, ref: "Release skill conventions: patch publishes changed package only; minor crossings bump create-* deps and app peer floors", label: mechanism }
provenance: captured
---

## Context

Consumers need to plan upgrades: whether a `0.x.y → 0.x.y+1` requires a
migration window, whether an app package must republish, and whether a
command they scripted still exists. Without a written policy, every
release is a surprise.

## Decision

- **Patch** = fixes + doc/skill corrections; may still ship a migration
  (schema fixes ride patches); never removes commands or moves peer
  floors.
- **Minor** = features, new migrations, shipped-file changes, possible
  peer-floor moves requiring app republish; scaffolder deps track the
  minor line.
- **Deprecation path** = stub with guidance first (the `generate`
  pattern), removal in a later release, always named in release notes.
- **Compatibility contract** = applied migrations are immutable, the
  customer-owned trees (`custom/`, config, `AGENTS.md` customer region,
  non-`spine-*` skills/workflows) are never overwritten, runtime API
  shapes are additive within a minor series.

## Alternatives rejected

- **"Patches never carry migrations"** — would force schema fixes to
  wait for minors, slowing real bugfixes.
- **Strict semver pre-1.0** — 0.x semver treats every minor as
  potentially breaking; the published policy is more informative than
  the version mechanics.

## Consequences

- Release notes must carry the checklist (migrations, upgrade steps,
  breaking changes) — the release skill's Step 10 enforces it.
- App packages' peer ranges are the compatibility ledger — a floor move
  is a release-blocking decision.
- Consumers can schedule patch adoption casually and minor adoption
  deliberately.
