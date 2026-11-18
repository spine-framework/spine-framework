---
title: "Why `link_types` exists"
kind: narrative
verified_against: 6ab1f37
verified_on: 2026-11-13
extends: .framework/src/instructions/runtime-collaboration.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `link_types` exists

Records need relationships — *blocks*, *depends on*, *verifies* — but a bare pair of IDs carries no semantics. `link_types` is the registry that names what a connection means, so platform code can query relationships and UI can render them consistently.

## The five whys

1. **Why not free-text relationship fields?** Free text can't be queried, validated, displayed consistently, or reasoned about by shared code. `links.link_type_id` is a required column, and `resolveLinkTypeIds` throws on unregistered slugs — the vocabulary is enforced, not suggested.
2. **Why not a hardcoded enum?** Every new relationship kind would need a platform change — domain semantics frozen into core, the same tangle `types` exists to remove.
3. **Why a registry table rather than config on each link row?** A registry gives relationships identity: a slug to resolve, a name/icon/color to render, and a constraint that stops typos from becoming data.
4. **Why app-scoped columns but global resolution?** The schema permits per-app vocabularies (`UNIQUE(app_id, slug)`), but the shared resolver looks slugs up globally. Cross-app relationships are legitimate — a work item can link to a ticket — but as a consequence, colliding slugs across apps will mis-resolve today. Treat slugs as platform-global.
5. **Root:** relationships are part of the domain, so their vocabulary must be app-definable — but they're queried by platform code, so that vocabulary must be registered data, not per-app convention.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (line ~135):

```sql
app_id uuid, slug text NOT NULL, name text NOT NULL,
description text, icon text, color text,
config jsonb DEFAULT '{}', is_active boolean DEFAULT true,
UNIQUE(app_id, slug)
```

Seeded per app via `seed/link-types.json`; resolved at runtime by `resolveLinkTypeIds()` in `_shared/resolve-ids.ts` (used by `permissions.ts` and the agent runner). No admin UI — seeding is the only supported workflow.

## How you'd use it

```json
// seed/link-types.json
[{ "slug": "depends_on", "name": "Depends on", "icon": "ArrowRight", "color": "#888" }]
```

```ts
const linkTypeIds = await resolveLinkTypeIds(['depends_on', 'blocks'])
```

## Who it's for

**Developers:** typed relationships with one queryable vocabulary — graph queries over `links` stay meaningful. **Agencies:** relationship semantics ship as seed data per app, not platform patches — but namespace your slugs (`myapp_depends_on`) since resolution is global.

## In one sentence

`link_types` gives relationships names the platform can query and the domain can extend.

---

*Agent-facing chain now lives in `.framework/src/instructions/runtime-collaboration.md` — `## Problem it solves`.*
