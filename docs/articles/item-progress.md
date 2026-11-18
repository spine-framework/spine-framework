---
title: "Why `item_progress` exists"
kind: narrative
verified_against: 16d9a06
verified_on: 2026-11-13
extends: .framework/src/instructions/concepts/runtime-records.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `item_progress` exists

"User X has completed 7 of 10 lessons" can't live on the item — that's per-person-per-record state, a second dimension a single record can't express. `item_progress` is the platform's generic answer, and it's more than a counter: it's a per-person state machine.

## The five whys

1. **Why a table instead of fields on items?** Progress is N×M — a field holds one value; "User X completed 7/10 lessons" needs rows.
2. **Why generic instead of per-app progress fields?** Completion/state tracking is a universal capability (courses, checklists, onboarding) that would otherwise be rebuilt per type.
3. **Why typed rows (`type_id`) with a declared pipeline?** Progress isn't just a percent — it's a state machine. The type's `design_schema.pipeline` declares the valid states; `isValidTransition` gates `not_started → in_progress → completed` (or whatever pipeline the app declares). Invalid transitions fail; `force: true` is the explicit override.
4. **Why person-scoped rows with RLS?** Progress is personal — each person sees their own; aggregate views are queries, not stored fields.
5. **Root:** cross-cutting state (per-person, per-record) is the second dimension a single record can't express — `item_progress` is the platform's generic pattern for "every record × every person" state, complete with a declarable transition machine.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (~line 314). Key columns: `person_id`, `item_id`, `type_id`, `status`, `score`, `data` (attempts, `started_at`, `completed_at` auto-stamped).

Dedicated function `item-progress.ts`: `list`, `get`, `upsert`, and a `transition` action for state-machine progressions. Upsert enforces person/item/account scoping (403 on cross-account), composes title/description, increments `attempts`, and validates transitions against the type's pipeline. Also in `admin-data`'s `VALID_ENTITIES` for generic read/write.

## How you'd use it

```tsx
await apiFetch('/api/item-progress?action=upsert', {
  method: 'POST',
  body: JSON.stringify({
    person_id: personId, item_id: lessonId,
    type_slug: 'lesson_progress',
    status: 'completed', score: 92
  })
})
```

## Who it's for

**Developers:** course progress, checklist completion, onboarding state — a declared pipeline per type, enforced transitions per person. **Agencies:** "track each learner's progress through each thing" is config, not a subsystem.

## In one sentence

`item_progress` is per-person-per-record state with a declarable state machine.

---

*Agent-facing chain now lives in `.framework/src/instructions/concepts/runtime-records.md` — `## Problem it solves`.*
