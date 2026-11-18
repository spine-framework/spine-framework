---
title: "Why `links` exists"
kind: narrative
verified_against: 16d9a06
verified_on: 2026-11-13
extends: .framework/src/instructions/runtime-collaboration.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `links` exists

Domain models are graphs. A ticket blocks another ticket; a work item depends on a deliverable; an article verifies an answer. No table structure can pre-declare every relationship a domain will need — `links` makes the relationship layer as generic as the record layer.

## The five whys

1. **Why a graph table instead of FK columns?** Relationships are many-to-many and open-ended — any record can relate to any other. Foreign keys fix both cardinality and participants.
2. **Why polymorphic `source_type`/`target_type`?** Links connect anything to anything — item↔item, item↔thread, cross-app — without a column or join table per pairing.
3. **Why `UNIQUE(source, target, link_type_id)`?** The same pair can carry multiple *kinds* of relationship (blocks *and* depends-on), but not duplicate ones. Dedup is a constraint, not application logic.
4. **Why `metadata` + `data` on the link?** Relationships carry data — weight, provenance, reason. Links are first-class records, not just join rows.
5. **Root:** domain models are graphs, and graphs can't be pre-declared in table structure — `links` makes the relationship layer as generic as the record layer, the only way a generic platform supports arbitrary domains.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (~line 105):

```sql
type_id uuid NOT NULL, account_id uuid NOT NULL,
link_type_id uuid,                      -- semantic (see link_types article)
source_type text, source_id uuid,
target_type text, target_id uuid,
link_type text, metadata jsonb, data jsonb,
UNIQUE (source_type, source_id, target_type, target_id, link_type_id)
```

Governed through `/api/admin-data` — type-stamping, permissions, triggers. `link_type_id` resolves via `resolveLinkTypeIds` against the `link_types` registry.

## How you'd use it

```tsx
await apiFetch('/api/admin-data?entity=links', {
  method: 'POST',
  body: JSON.stringify({
    entity: 'links', type_slug: 'work_link',
    source_type: 'items', source_id: blockerId,
    target_type: 'items', target_id: blockedId,
    link_type: 'blocks'
  })
})
```

## Who it's for

**Developers:** dependencies, hierarchies, cross-references, verification edges — one table, one query, any pair. **Agencies:** a client's relationship model grows with their domain without schema changes — new vocabulary is a `link_types` seed row, not a migration.

## In one sentence

`links` makes the graph between records as declarable as the records themselves.

---

*Agent-facing chain now lives in `.framework/src/instructions/runtime-collaboration.md` — `## Problem it solves`.*
