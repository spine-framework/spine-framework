---
id: spine-framework:0013-stamped-schema-snapshots
title: Runtime records snapshot design_schema/validation_schema at creation — type updates never reach existing rows
status: accepted
kind: invariant
owner: package
since: 0.4.0
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/functions/_shared/funnel.ts
  - .framework/functions/admin-data.ts
  - scripts/restamp-ao-record-schemas.ts
enforced_by:
  - custom/migrations/048_demo_kb_article_tags_reconcile.sql
evidence:
  - { kind: source, ref: "records carry stamped design_schema/validation_schema at creation; admin-data's 'No permissions defined' gate reads the stamp, not the live type", label: source }
  - { kind: source, ref: "migrations 048/051 restamp existing rows because updating public.types only affects NEW records", label: source }
provenance: reconstructed
---

## Invariant

Every runtime record stores its own copy of `design_schema` /
`validation_schema` (and `created_by` for human principals) **at creation
time**. The stored stamp — not the live `public.types` row — is what
validation and permission evaluation read.

Consequences:

- Updating `public.types.design_schema` changes only NEW records. To change
  existing rows you must restamp them (see `scripts/restamp-ao-record-schemas.ts`,
  migrations 048/051).
- Records *missing* stamped schemas fail admin-data's
  "No permissions defined" gate — signal items must be stamped on write
  (funnel.ts) or they become invisible to the permission system.
- A schema change shipped without a restamp plan silently produces two
  record populations behaving differently — the classic source of
  "works for new tickets, broken for old ones" bugs.

## Source

Triage of markers in funnel.ts, migration 051, and migration 048. See
`docs/agents/note-triage-review.md` A2.
