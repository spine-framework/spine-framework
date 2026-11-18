---
id: spine-framework:0018-docs-and-skills-lock-step
title: docs and skills must carry provenance anchors and are gated at release — accuracy or archival, no third state
status: accepted
kind: decision
owner: package
since: 0.6.1
until: null
supersedes: null
superseded_by: null
links: [spine-framework:0017-sophisticated-simplicity]
applies_to:
  - docs/archive/0.7.0/docs-skills-realignment.md
  - scripts/docs-lint.mts
  - scripts/docs-release-check.mts
  - scripts/docs-retention-check.mts
  - scripts/lib/docs-common.mts
  - .devin/skills/docs-sync/SKILL.md
  - .framework/templates/agent/skills/spine-docs-sync/SKILL.md
  - .framework/templates/agent/AGENTS.md
enforced_by:
  - scripts/docs-lint.mts
  - scripts/docs-release-check.mts
  - scripts/docs-retention-check.mts
  - .framework/tests/unit/docs-lint.test.ts
  - .framework/tests/unit/decision-records.test.ts
evidence:
  - { kind: doc, ref: "docs/archive/0.6.1/verdicts-0.6.1.md — 114/114 book pages evidentially stale; nothing re-verified pages when cited code moved", label: source }
  - { kind: doc, ref: "Owner direction 2026-11-13/14: docs validated against code or recorded human knowledge; accuracy or archival", label: source }
provenance: captured
---

## Context

The 0.6.1 baseline audit found every anchored book page had at least one cited
source file that changed after `verified_against`, an unverified
113-file second documentation tree, and shipped `.framework/docs/` mixing
consumer and internal content. Documentation drifted because nothing checked
it: claims were asserted without provenance and never re-verified.

## Decision

A doc or skill is in exactly one of three states:

- **Living** — carries `verified_against`/`verified_on` and either
  `source_files` (code-derived claims) or `asserted_by` (recorded human
  source). Re-verified whenever cited sources change.
- **Point-in-time** — declares `describes` (the commit/version it covers) and
  lives under `docs/archive/<version>/` or as a decision record.
- **Gone** — only after its content is demonstrably preserved elsewhere.

Enforcement (per `0017-sophisticated-simplicity` — the contract is small):

- `docs:lint` (in `npm run gate`) checks the frontmatter contract, the
  location allowlist, the retired-tool denylist, and dead references —
  including skill `depends_on` files/commands.
- `docs:release-check` computes affected/stale docs from `source_files` at
  release; first rc runs report-mode against `docs-debt.json`, later releases
  hard-fail on debt.
- `docs:retention-check` guards the 5-whys corpus through consolidation.
- Version stamps are generated at pack time (`docs-manifest.json`); authors
  own commit anchors, the release owns versions.

## Alternatives rejected

- **Author-written version stamps** — two sources of version truth drift.
- **Soft gate forever** — a permanent waiver teaches the linter to be ignored;
  the debt file may only shrink.
- **Archive-all** — discards verified content and the 5-whys layer.
- **Per-doc sign-off ceremony** — process machinery that rots faster than the
  invariants it guards.

## Consequences

- `docs-debt.json` was committed at the v2 cutover, could only shrink, and
  was deleted 2026-11-15 once the realignment debt reached zero — any
  violation now fails `docs:lint` outright.
- A change that touches cited `source_files` is incomplete until the affected
  pages are re-verified in the same change (`docs-sync` procedure).
- Process/why claims that look wrong are flagged to their recorded owner —
  never silently rewritten by an agent.
