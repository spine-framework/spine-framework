---
id: spine-framework:0017-sophisticated-simplicity
title: sophisticated simplicity is a design principle — prefer the smallest solution that satisfies the constraint
status: accepted
kind: decision
owner: package
since: 0.6.1
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - AGENTS.md
  - .framework/templates/agent/skills/spine-architect/SKILL.md
  - docs/archive/0.7.0/docs-skills-realignment.md
enforced_by: []
evidence:
  - { kind: doc, ref: "Owner direction, 2026-11-14 session: AIs tend to solve problems by adding complexity; Spine's DNA is sophisticated simplicity (the Jobs CD example — the user inserting a disc has already said what they want: PLAY)", label: source }
provenance: captured
---

## Context

Owner direction during review of the docs/skills realignment megaplan: the
plan's own machinery (six scripts, ~9 authored frontmatter fields, a debt
ratchet, manifest ceremony) exhibited the failure mode it was meant to
govern — solving a problem by adding moving parts. The owner named the
counter-principle: **sophisticated simplicity**. Canonical example: a user
who inserts a music CD has already provided all the direction the product
needs — the answer is PLAY, not a designed experience around the disc.

## Decision

Prefer the smallest solution that satisfies the constraint, at every scale:

- **In design review** — when a proposal adds machinery (new tools, files,
  process, layers), first ask what the existing primitives and the user's
  input already provide. The inserted disc is the direction.
- **In docs and process** — the contract is the invariant, not the ceremony
  around it. A doc states where its truth comes from and when it was
  checked; enforcement is one check, not a pipeline.
- **In code** — the right primitive over a new wrapper; the smallest
  conforming path over an extensible framework for a problem that exists
  once.

Complexity is spent where the actual risk lives, not spread evenly.

## Alternatives rejected

- **Process machinery as safety** — more checks, manifests, and ratchets
  feel rigorous but rot faster than the invariants they guard; each new
  moving part is a new thing that can be stale.
- **Treating simplicity as style** — leaving it to taste produces drift;
  recording it as a principle lets reviewers reject complexity explicitly.

## Consequences

- Agents working on Spine projects are expected to apply this before
  proposing additions (encoded in the `spine-architect` skill checklist).
- The docs/skills realignment plan was revised to a reduced core under this
  principle.
- This is a review principle, not a lintable rule — `enforced_by` is
  intentionally empty; enforcement is human/agent judgment at design time.
