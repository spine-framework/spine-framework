---
id: spine-framework:0001-admin-data-only
title: Runtime record CRUD goes through /api/admin-data, never custom wrappers
status: accepted
kind: invariant
owner: package
since: 0.5.4
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/functions/admin-data.ts
  - .framework/functions/_shared/permissions.ts
enforced_by: []
evidence:
  - { kind: doc, ref: AGENTS.md, label: source }
  - { kind: doc, ref: .framework/templates/agent/AGENTS.md, label: source }
provenance: reconstructed
---

## Context

Custom apps need to create, update, list, and delete runtime records
(`items`, `threads`, `messages`, `links`, `attachments`, `watchers`, …).

## Decision

All runtime record CRUD — in every custom app — goes through the generic
`/api/admin-data` endpoint. Apps never ship their own Netlify function
wrappers for runtime record operations; find-or-create flows call
`/api/admin-data` directly from the client or a hook.

## Alternatives rejected

- Per-app `custom_*` CRUD wrappers — they bypass the shared permission,
  type-resolution, audit, and trigger logic in `admin-data`, and they are a
  recurring export/bundling hazard.

## Consequences

- Permissions, `design_schema` validation, audit logging, and triggers stay
  in one place; custom wrappers would silently diverge.
- `custom_*` functions are reserved for genuinely bespoke operations
  (journeys, webhooks, cron), not record CRUD.

Unverified: no automated check currently rejects `custom_*` functions that
implement runtime CRUD — enforcement is by review and this record.
