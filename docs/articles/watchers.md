---
title: "Why `watchers` exists"
kind: narrative
verified_against: 16d9a06
verified_on: 2026-11-13
extends: .framework/src/instructions/runtime-collaboration.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `watchers` exists

Notifications need one question answered: *who cares about this record?* `watchers` makes that queryable data — so any record type is subscribable and any notifier can resolve its audience.

## The five whys

1. **Why not a subscribers field per type?** "Someone cares about changes" is universal. Per-type lists are per-type plumbing and can't drive generic notification logic.
2. **Why polymorphic `target_type`/`target_id`?** You watch *any* record — the same reason threads and links are polymorphic. The platform's attachment pattern applies uniformly.
3. **Why `watch_type` + `notification_level`?** Watching isn't binary — *all changes* vs *status only* vs *mentions*. The preference must live on the subscription or notification routing can't be generic.
4. **Why `UNIQUE(target, person)`?** One subscription per person per thing — duplicate watchers mean duplicate notifications.
5. **Root:** notification routing needs a single place to answer "who cares about this?" — `watchers` makes interest queryable data, so any notifier can find its audience: pipelines resolve `watchers` as recipients, and agents can subscribe people programmatically.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (~line 125):

```sql
type_id uuid NOT NULL, account_id uuid,
target_type text NOT NULL, target_id uuid NOT NULL,
person_id uuid NOT NULL,
watch_type text DEFAULT 'all',
notification_level text DEFAULT 'all',
UNIQUE (target_type, target_id, person_id)
```

Consumers in the platform: `pipeline-runner.ts` resolves `watchers` in `ENTITY_RECIPIENTS` for notify actions; `agent-runner.ts` inserts watcher rows when a routing directive calls for it.

## How you'd use it

```tsx
await apiFetch('/api/admin-data?entity=watchers', {
  method: 'POST',
  body: JSON.stringify({
    entity: 'watchers', type_slug: 'watch',
    target_type: 'items', target_id: ticketId,
    person_id: personId, notification_level: 'mentions'
  })
})
```

## Who it's for

**Developers:** subscriptions, follows, and notification audiences are one table — add a watcher row, and every notifier downstream already knows what to do. **Agencies:** "alert the right people when X changes" works out of the box on any record a client defines.

## In one sentence

`watchers` turns "who should hear about this?" into a query.

---

*Agent-facing chain now lives in `.framework/src/instructions/runtime-collaboration.md` — `## Problem it solves`.*
