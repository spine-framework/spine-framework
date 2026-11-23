---
title: "Documentation"
kind: index
verified_against: 77543d7
verified_on: 2026-11-22
source_files:
  - .framework/src/instructions/
  - docs/archive/0.7.0/docs-skills-realignment.md
---

# Documentation

This directory holds **monorepo** documentation — for people working on
spine-ia itself. Product documentation ships with the packages and does not
live here (see `docs/archive/0.7.0/docs-skills-realignment.md`).

## Where things live

- `.framework/src/instructions/` — the shipped instruction book; **canonical**
  for the framework product. Where it disagrees with anything else, the book
  wins.
- `docs/archive/0.6.1/spine-framework-documentation/` — the pre-book
  documentation tree, archived at 0.6.1 after its unique content was mined
  into the book (see `docs/audit/coverage-matrix-0.6.1.md`). Historical —
  do not cite from living docs.
- `docs/articles/` — narrative essays: the long-form "why" layer for
  primitives.
- `docs/agents/` — agent-facing depth docs, loaded via the `AGENTS.md` path
  triggers.
- `docs/audit/` — docs tooling artifacts: spec, verification ledger,
  machine-generated `facts/`, inventories, verdict tables.
- `docs/plans/` — point-in-time plans; archived after completion.
- `docs/archive/` — frozen point-in-time docs by version.

## Archived documentation

Older documentation lives under `archive/` and is kept for reference only.
If a conflict exists, the instruction book wins.
