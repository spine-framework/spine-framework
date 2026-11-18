---
title: "Why `notifications` exists"
kind: narrative
verified_against: b8e9495
verified_on: 2026-11-13
extends: .framework/src/instructions/notifications.md
source_files:
  - .framework/migrations/050_notifications.sql
---

# Why `notifications` exists

Automation needs to reach humans durably. A pipeline finishes, an agent escalates, a record changes — and someone needs to *see* it, not just have an email fired at them. `notifications` is the user's inbox: durable, person-scoped, and tied to the record it concerns.

## The five whys

1. **Why a table instead of delivery logs?** A notification is user-facing state — unread/read, badge counts, a list. `webhook_deliveries` is transport; `notifications` is the inbox.
2. **Why `person_id` + polymorphic `target_type`/`target_id`?** A notification ties a message to a person *and* a thing — "your ticket changed" links to the record it concerns.
3. **Why `source_type`/`source_id`?** Provenance — which pipeline execution or request produced it. The default (`pipeline_execution`) reflects that automation, not humans, is the primary producer.
4. **Why `is_read`/`read_at` on the row?** Read state is per-person state on the notification itself — the badge count is a query, not a counter to keep in sync.
5. **Root:** automation needs a way to reach humans — `notifications` is where pipelines and agents deposit durable, person-scoped messages so "tell someone" is a governed write, not an email bolted on.

## What it actually is

Defined in `.framework/migrations/050_notifications.sql`:

```sql
account_id, person_id,           -- recipient
source_type, source_id,          -- producer (default 'pipeline_execution')
target_type, target_id,          -- the record it concerns
message, data, is_read, read_at
```

Writers: `pipeline-runner` notify stages (resolving `watchers` as recipients) and `agent-runner` escalation paths. Readers: no generic endpoint yet — app-level UIs query via RLS (`person_id` = viewer).

## Who it's for

**Developers:** "notify the right people" is a pipeline stage or a row write — the audience resolution (`watchers`) already exists. **Agencies:** every automated reach-out to a client's users is a durable, auditable message — not a fire-and-forget email.

## In one sentence

`notifications` is where automation leaves durable messages for people.

---

*Agent-facing chain now lives in `.framework/src/instructions/notifications.md` — `## Problem it solves`.*
