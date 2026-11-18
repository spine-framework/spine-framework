---
title: "Why `types` exists"
kind: narrative
verified_against: 6ab1f37
verified_on: 2026-11-13
extends: .framework/src/instructions/types.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `types` exists

Every business application needs domain records — tickets, deals, articles — and every domain record traditionally means a new table plus its own validation, permissions, and UI wiring. `types` is why Spine Framework doesn't work that way.

## The five whys

1. **Why not a table per entity?** Because then the shared runtime — CRUD, permissions, triggers, views, admin UI — would need custom code per entity. The domain gets tangled back into the platform, and the platform stops being reusable.
2. **Why not let each app write its own handlers?** Each handler would re-implement validation, permission checks, and audit differently — the exact foundation bugs the framework exists to eliminate.
3. **Why keep the schema in the database rather than app code?** A schema in code only runs where that code is deployed. A schema in the database is enforced on *every* write path — UI, API, pipelines, agents, third-party integrations.
4. **Why declarative (`design_schema`) rather than stored procedures or config code?** Declarative data can be validated, diffed, seeded, reconciled on upgrade, and interpreted generically by UI and validators alike. Code can't.
5. **Root:** reusable foundations die when domain knowledge is hardcoded. `types` is the seam where the platform ends and the app begins — without a data-defined schema registry there is no generic middle layer at all.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql`. Each row is a record type:

- `kind` + `slug` — globally unique pair identifying the type
- `design_schema` — fields, views, `record_permissions`, `functionality` bindings
- `validation_schema` — auto-generated from `design_schema` (`generateValidationSchema()`); never hand-edited

Runtime records in `items` carry a `type_id`; `admin-data.ts` resolves `type_slug → type_id`, validates payloads against `validation_schema`, and applies `record_permissions` on every read/write.

## How you'd use it

```json
// custom/apps/my-app/seed/types.json
{
  "kind": "item", "slug": "task", "name": "Task",
  "design_schema": {
    "scope": "account",
    "fields": { "title": { "data_type": "text", "required": true, "system": true } },
    "views": { "default_list": {}, "default_detail": {} },
    "record_permissions": { "member": ["read"] }
  }
}
```

Then query at runtime: `/api/admin-data?action=list&entity=items&type_slug=task`.

## Who it's for

**Developers:** your entire data model is seed JSON — no migrations for domain entities, no handlers for standard CRUD. **Agencies:** a client app's schema is a file you can diff, version, and reseed — not a pile of table DDL.

## In one sentence

`types` makes the domain data, so the platform can stay generic.

---

*Agent-facing chain now lives in `.framework/src/instructions/types.md` — `## Problem it solves`.*
