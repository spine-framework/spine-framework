---
title: "Why `items` exists"
kind: narrative
verified_against: 16d9a06
verified_on: 2026-11-13
extends: .framework/src/instructions/concepts/runtime-records.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `items` exists

If `types` is where the domain enters Spine Framework as data, `items` is where it lives. Every domain record — ticket, deal, article, order — is a row here, governed by the same machinery regardless of what it represents.

## The five whys

1. **Why one table for all domain records?** Per-entity tables mean per-entity CRUD, RLS policies, UI, and permissions — the foundation rebuilt inside the app layer.
2. **Why not a document store?** Records need typed fields, permissions, triggers, and schema-stamped validation. An unstructured store pushes all of that back into app code.
3. **Why `type_id` + `data` JSONB instead of generated tables?** Apps declare entities as seed data and ship zero DDL. `design_schema` is stamped at creation, so each record carries its contract.
4. **Why the `system` field split?** Common fields (title, status) need indexing and joins; arbitrary fields need freedom. `system: true` fields are real columns; the rest live in `data`.
5. **Root:** `types` is the seam where the domain enters as data; `items` is the governed store that makes it real — any declared type becomes a first-class record with permissions, validation, triggers, and audit for free.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql`. Key columns: `type_id`, `account_id`, `title`, `status`, `data` (JSONB), plus stamped `design_schema`/`validation_schema` snapshots.

All CRUD flows through `/api/admin-data` (`admin-data.ts`, `VALID_ENTITIES` line ~56): resolves `type_slug → type_id`, sanitizes fields, enforces record/field permissions, writes audit logs, fires create/update/delete triggers, soft-deletes via `is_active`.

## How you'd use it

```tsx
const res = await apiFetch('/api/admin-data?entity=items', {
  method: 'POST',
  body: JSON.stringify({
    entity: 'items', type_slug: 'support_ticket',
    title: 'Cannot log in', status: 'open',
    data: { priority: 'high' }   // non-system fields
  })
})
```

## Who it's for

**Developers:** one endpoint, one permissions model, one audit trail — for every entity you'll ever add. **Agencies:** client entities are seed declarations; a new "thing" is a types row, not a table + API + migration.

## In one sentence

`items` is the single governed store that turns a declared type into a working record.

---

*Agent-facing chain now lives in `.framework/src/instructions/concepts/runtime-records.md` — `## Problem it solves`.*
