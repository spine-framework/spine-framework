---
title: "Why `messages` exists"
kind: narrative
verified_against: 16d9a06
verified_on: 2026-11-13
extends: .framework/src/instructions/runtime-collaboration.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `messages` exists

If a thread is the conversation's context, messages are its content — and content needs structure the container can't provide: ordering, direction, audience, and authorship per entry.

## The five whys

1. **Why a separate table from threads?** A thread is a context; messages are its ordered content. Different cardinality, different lifecycle, different permissions — a message can be internal-only inside a public thread.
2. **Why `sequence` + `UNIQUE(thread_id, sequence)` instead of timestamps?** Deterministic ordering that survives clock skew and concurrent writers. Sequence is a contract; timestamps are a hint.
3. **Why `direction` + `visibility` + `person_id` per row?** Messages flow both ways (inbound/outbound), have different audiences (internal vs customer-visible), and need authorship for audit and attribution — per message, not per thread.
4. **Why `type_id` on messages?** Apps declare *kinds* of message — note vs email vs system event — each with its own schema. Types-as-data at message granularity.
5. **Root:** conversation content needs structure the container can't provide — ordering, direction, audience, authorship per entry — so messages are their own typed, sequenced primitive rather than text blobs on the thread.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (~line 92):

```sql
type_id uuid NOT NULL, thread_id uuid NOT NULL, account_id uuid,
content text NOT NULL, direction text DEFAULT 'outbound',
sequence integer NOT NULL, visibility text DEFAULT 'internal',
person_id uuid, UNIQUE (thread_id, sequence)
```

`admin-data` applies audience filtering: non-internal readers only see non-internal messages (visibility checks in `admin-data.ts` ~lines 217–233).

## How you'd use it

```tsx
await apiFetch('/api/admin-data?entity=messages', {
  method: 'POST',
  body: JSON.stringify({
    entity: 'messages', type_slug: 'reply',
    thread_id: threadId, content: 'Thanks — investigating.',
    direction: 'outbound', visibility: 'public',
    sequence: nextSeq
  })
})
```

## Who it's for

**Developers:** ordering, visibility, and authorship come free — build the UI, not the message model. **Agencies:** a support thread, a comment stream, and an agent transcript share one schema — each client app just declares its message types.

## In one sentence

`messages` gives every conversation ordered, directed, audience-aware content.

---

*Agent-facing chain now lives in `.framework/src/instructions/runtime-collaboration.md` — `## Problem it solves`.*
