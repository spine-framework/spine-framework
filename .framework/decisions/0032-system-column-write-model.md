---
id: spine-framework:0032-system-column-write-model
title: System record columns are governed by design_schema permissions like data fields — the non-data passthrough is removed
status: accepted
kind: decision
owner: package
since: 0.10.2
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/functions/_shared/permissions.ts
  - .framework/functions/admin-data.ts
  - .framework/src/instructions/reference/api/admin-data.md
  - .framework/src/instructions/concepts/design-schema.md
enforced_by:
  - .framework/tests/unit/admin-data-system-columns.test.ts
evidence:
  - { kind: source, ref: "permissions.ts validateFirstSurfaceUpdatePermissions copied every non-data key verbatim — 'Copy non-data/metadata fields through'; the privileged-column denylist omitted status/title/is_active", label: observed }
  - { kind: report, ref: "downstream project build review 2026-11-25: a member with `update` on a type could PATCH top-level `status` and bypass an app-level state machine; the app responded by granting members read-only on all state records and mediating every write through custom functions", label: observed }
provenance: captured
---

## Context

`admin-data` update sanitization gated `data.*` fields by
`fields.*.permissions`, then copied every non-data key (`status`, `title`,
`is_active`, `metadata`) through unchecked for any role holding the record
`update` grant. `create` likewise accepted a caller-supplied `status`.

Consequence: **record-level permissions could never safely coexist with an
application state machine.** Any member update could rewrite lifecycle
columns directly. A downstream project discovered this and compensated by
denying members all writes on state-bearing types and routing every
mutation through custom functions — the record layer abdicated to app code.

## Decision

System columns (`status`, `title`, `is_active`, `metadata` — anything not
under `data`) are treated as fields subject to `design_schema` permissions:

- `fields.*.system: true` semantics apply to record columns by default:
  non-admin principals cannot write them through `update` or `create`.
- A type may declare `system_fields` in `design_schema`
  (`{ "<column>": { "<role>": ["write"] } }`) to grant a specific role a
  specific column — the escape hatch for types that genuinely want a
  member-writable `title`.
- The denylist for privileged columns (`account_id`, `type_id`,
  `design_schema`, `validation_schema`, `created_by`, `app_id`,
  `auth_uid`) stays hard-denied for tenant callers regardless.

## Alternatives rejected

- **Extend the hardcoded denylist** (`status`, `is_active`, `title`): same
  shape as today — every new column is a new exposure until remembered; no
  per-type opt-out. The schema-driven model fixes the class of bug, not
  this instance.
- **Leave passthrough, document the risk**: the docs already taught the
  hole (the PATCH example wrote `status` top-level). Documentation cannot
  make an accidental grant safe.

## Consequences

- Existing types granting member `update` keep working for `data` writes;
  member `PATCH {status}`/`{title}` now 403s unless `system_fields` grants
  it. Apps that relied on member status writes must declare the grant.
- A record-level `update` grant plus a state machine is now expressible:
  `member: [update]` on data, `system_fields` silent on `status`.
