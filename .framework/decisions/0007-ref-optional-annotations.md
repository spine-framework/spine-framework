---
id: spine-framework:0007-ref-optional-annotations
title: Intentionally-optional UPDATE references are annotated in-migration, never rewritten
status: accepted
kind: invariant
owner: package
since: 0.5.5
until: null
supersedes: null
superseded_by: null
links:
  - spine-framework:0001-admin-data-only
applies_to:
  - .framework/cli/lib/migration-refs.ts
  - .framework/migrations/
  - custom/migrations/
enforced_by:
  - .framework/tests/unit/migration-refs.test.ts
  - custom/tests/migration-refs.test.ts
evidence:
  - { kind: commit, ref: 7d9f1d5 }
  - { kind: test, ref: custom/tests/migration-refs.test.ts, label: observed }
provenance: captured
---

## Context

The migration-reference lint flags every `UPDATE <table> ... WHERE
slug/name = '<value>'` that can't be traced to a seed row or an earlier
migration/statement. Some references are *deliberately* optional — the
migration is a no-op when the row is absent (app-specific types not always
installed, archived type slugs).

## Decision

Published migrations are never rewritten to satisfy the lint. Instead, a
comment-only annotation on the statement — `-- ref-optional` (or
`-- ref-ok`) — marks the reference intentionally unresolved; the lint warns
instead of failing. Missing *unannotated* references still fail.

## Alternatives rejected

- Editing the SQL to `INSERT ... ON CONFLICT` or conditional guards — changes
  semantics of published migrations; forbidden.
- Keeping a suppression list outside the migration — the *why* then lives
  away from the statement it explains and rots silently.

## Consequences

- `ref-optional` warnings are printed in test output so they stay visible.
- `migrate --preflight` (Stage 1.7) reuses the same annotations: optional
  refs warn, missing mandatory refs block.
