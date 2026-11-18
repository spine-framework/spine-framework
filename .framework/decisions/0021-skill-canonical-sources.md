---
id: spine-framework:0021-skill-canonical-sources
title: each skill has one canonical source; book pages and skills link bidirectionally
status: accepted
kind: decision
owner: package
since: 0.6.1
until: null
supersedes: null
superseded_by: null
links: [spine-framework:0018-docs-and-skills-lock-step]
applies_to:
  - .devin/skills/
  - custom/.devin/skills/
  - .framework/templates/agent/skills/
  - .framework/src/instructions/internal/docs-contract.md
enforced_by:
  - .framework/tests/unit/agent-files.test.ts
  - scripts/docs-lint.mts
evidence:
  - { kind: source, ref: ".devin/skills/spine-architect and .framework/templates/agent/skills/spine-architect had drifted in description, tools, and verification lists before this decision", label: source }
  - { kind: source, ref: ".devin/skills/spine_schema_validate rewritten as the monorepo diagnostic extension of shipped spine-schema (MCP validate + restamp only)", label: source }
  - { kind: doc, ref: ".framework/src/instructions/internal/docs-contract.md — skill-linkage rule: depends_on.files lists owned book pages; skills: frontmatter names covering skills", label: source }
provenance: captured
---
# 0021 — Skill canonical sources and doc linkage

## Decision

Each skill has **one canonical source**; every other copy is a pointer or a
derived, drift-checked instance:

- **Shipped skills** live once at
  `.framework/templates/agent/skills/spine-*/SKILL.md`. The monorepo's own
  `.devin/skills/spine-architect/` is a pointer stub to its template, not a
  fork — duplicated copies had already drifted (different descriptions,
  tools, and verification lists).
- **Monorepo-only skills** keep distinct names and scopes instead of forked
  twins: `.devin/skills/spine_schema_validate/` is the diagnostic extension of
  the shipped `spine-schema` — it defers schema *authoring* to `spine-schema`
  and owns only live diagnosis (the `spine-framework` MCP validate call,
  drift explanation, and runtime-record restamping via `/api/admin-data`).
- **App-shipped skills** (`agent/skills/<prefix>_*/`) are package source;
  `custom/.devin/skills/<prefix>_*/` is their installed instance. The two are
  byte-identical in this repo; `install-app` copies, `uninstall-app` removes.
- **Linkage is bidirectional**: a `SKILL.md` lists the book pages it owns in
  `depends_on.files` (lint-checked to exist), and book pages name their
  covering skills in an optional `skills:` frontmatter list.

## Alternatives considered

- **Keep both full copies in sync** — rejected: drift had already occurred
  and nothing enforced equality; a pointer is unambiguous.
- **Delete `.devin/skills/spine-architect` outright** — rejected: the
  monorepo's agent runtime loads skills from `.devin/skills/`; a pointer
  stub preserves invocation while eliminating content fork.
- **Rename `spine_schema_validate` → `spine-schema` to match** — rejected:
  they are complementary skills (diagnose vs author), not the same skill;
  collapsing the name would hide the MCP/live-DB diagnostic path consumers
  cannot use.
- **Lint-enforce the `skills:` field on every book page** — rejected for
  now: linkage is a convention recorded in `internal/docs-contract.md`;
  a hard rule belongs in a later lint version if drift recurs.

## Invariants

- `spine_schema_validate` and `spine-schema` must not re-fork into
  overlapping scopes; when in doubt the shipped template wins and the
  `.devin` side keeps only monorepo-specific procedure (MCP, admin-data).
- Removing or renaming a book page must update the `skills:` and
  `depends_on.files` lists that name it (both lint-visible).
