---
id: spine-framework:0028-test-runs-run-shape
title: test_runs is run-shaped; registry columns are optional
status: accepted
kind: invariant
owner: package
since: 0.7.0
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/migrations/082_test_runs_registry_optional.sql
  - .framework/tests/reporter.ts#writeRunResults
  - .framework/cli/commands/doctor.ts#checkTestRuns
  - .framework/functions/tests.ts
enforced_by:
  - .framework/migrations/082_test_runs_registry_optional.sql
evidence:
  - { kind: doc, ref: ".framework/src/instructions/testing.md", label: source }
  - { kind: commit, ref: "018_runtime_tables.sql", label: source }
provenance: captured
---

## Context

`public.test_runs` accumulated two shapes. The archive-era table
(`archive/008_test_runs.sql`) was run-shaped — `suite`, `status`,
`started_at`, counts — consumed by `tests.ts`, `system.ts`, doctor's
`checkTestRuns`, `tests/reporter.ts`, and `admin-data`'s RAW_ENTITIES path
(which requires `suite` and never sends `name`/`slug`). The consolidated
`001_core_schema.sql` recreated it with generic-entity boilerplate
(`slug`/`name` NOT NULL, `UNIQUE(app_id, slug)`), and `018` added the
runner columns back additively — but left the NOT NULL constraints, so
every run insert failed on `null value in column "name"` and no consumer
could ever satisfy the doctor check.

## Decision

The runner columns are the write contract; `slug`/`name`/`config`/
`metadata` remain for VALID_ENTITIES/admin-data reads but are optional.
Migration `082` drops the NOT NULLs and the `(app_id, slug)` unique
constraint (run history has no slug-identity semantics) and defaults
`started_at` to `now()`. `spine_fill_slug` still fills slug from name for
any caller that supplies one.

## Alternatives rejected

- **Reporter sends name/slug, no migration** — fixes the reporter but
  leaves the same landmine for admin-data RAW inserts and external
  harnesses that `testing.md` tells to insert run rows directly.
- **Retire the pipeline** (drop `checkTestRuns`, reporter, Testing
  dashboard) — rejected; the dashboard and doctor check are documented,
  shipped features with live consumers.
- **Separate run table** — every consumer queries `test_runs` by name;
  a new table would fork the contract.

## Consequences

Writers may omit `slug`/`name` on `test_runs`; readers must tolerate
nulls there (dashboard/doctor only read runner columns). Schema is now
hybrid: `UNIQUE(app_id, slug)` no longer protects registry consumers, but
nothing ever wrote test_runs through that path.
