---
title: "Why `threads` exists"
kind: narrative
verified_against: 16d9a06
verified_on: 2026-11-13
extends: .framework/src/instructions/runtime-collaboration.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `threads` exists

Almost every record in a business app eventually needs conversation — comments on a ticket, chat on an order, history on a case. `threads` is the platform's answer to "attach a conversation to anything" — provided once, polymorphically, instead of rebuilt per type. It is the clearest example of Spine Framework's *capability table* pattern: a concern every domain needs, implemented once at the platform level.

## The five whys

1. **Why not a comment field per type?** Per-type conversation means per-type plumbing — fields, permissions, UI, notification hooks — for a capability every record can need.
2. **Why polymorphic `target_type`/`target_id`?** Threads attach to *any* record — an item, an account, another app's record — without schema changes per attachable thing.
3. **Why a container separate from messages?** A thread has its own lifecycle — open/closed, visibility, participants — independent of the messages inside it.
4. **Why `UNIQUE(target_type, target_id, visibility)`?** One conversation context per thing per audience. Internal and public threads on the same record are separate contexts, not filtered views of one pile.
5. **Root:** conversation is a capability, not a property of one entity — the platform provides it once, polymorphically, so every type gets threads without shipping a comments feature.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (~line 81):

```sql
type_id uuid NOT NULL, account_id uuid NOT NULL,
title text, target_type text NOT NULL, target_id uuid NOT NULL,
visibility text DEFAULT 'internal', status text DEFAULT 'open',
UNIQUE (target_type, target_id, visibility)
```

Governed through `/api/admin-data` like items: type-stamping, permissions, triggers, soft-delete. Typed threads (`type_id`) let apps declare kinds of conversation — e.g. a support conversation vs a review thread — with their own schema.

## How you'd use it

```tsx
await apiFetch('/api/admin-data?entity=threads', {
  method: 'POST',
  body: JSON.stringify({
    entity: 'threads', type_slug: 'conversation',
    target_type: 'items', target_id: itemId,
    visibility: 'public', title: 'Customer thread'
  })
})
```

## Who it's for

**Developers:** "this thing has a discussion" is one API call — never a feature. **Agencies:** conversation semantics ship per app via thread types, and every client gets the same governed implementation.

## In one sentence

`threads` makes conversation a platform capability instead of a per-type feature.

---

*Agent-facing chain now lives in `.framework/src/instructions/runtime-collaboration.md` — `## Problem it solves`.*
