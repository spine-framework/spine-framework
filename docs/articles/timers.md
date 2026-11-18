---
title: "Why `timers` exists"
kind: narrative
verified_against: 9adea05
verified_on: 2026-11-13
extends: .framework/src/instructions/timers.md
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Why `timers` exists

"Follow up in 48 hours." "Decay the score weekly." "Escalate if untouched." Time is a trigger like any other event — `timers` makes *later* a governed, auditable, account-scoped primitive instead of an external scheduler that has to reach back in.

## The five whys

1. **Why not external cron?** Timed work is bound to *this* app's data and account context — an external scheduler loses both and becomes another credential surface.
2. **Why rows with `next_execution`?** Each timer is an armed instance — the row *is* the schedule state. `update_timer_after_run` (migration `071`) advances or stops `next_execution` atomically, so missed or duplicate runs are a data problem, not a clock problem.
3. **Why typed (`type_id`, `UNIQUE(app_id, slug)`)?** Timers are domain vocabulary — "SLA reminder" vs "score decay" are app-declared kinds.
4. **Why interval *and* one-shot in one table?** Both are "fire at time T" — `config.interval_minutes`/`interval_seconds` covers recurring; `config.run_at`/`schedule` (ISO only — `Date.parse` is too lenient with cron text) arms one-shots.
5. **Root:** time is a trigger like any other event — `timers` makes "later" a governed, auditable, account-scoped primitive instead of an external dependency.

## What it actually is

`timers` in `001`; `next_execution`/`timer_type` reconciled in `020`; rescheduling RPC in `071`. `timers.ts` computes `next_execution` on arm; the `system-cron` sweep (via `trigger-scheduler.ts`) fires due timers.

## How you'd use it

```tsx
await apiFetch('/api/admin-data?entity=timers', {
  method: 'POST',
  body: JSON.stringify({
    entity: 'timers', type_slug: 'sla_reminder', slug: 'sla-48h',
    name: '48h SLA reminder', config: { interval_minutes: 2880 }
  })
})
```

## Who it's for

**Developers:** delayed and recurring work is data with state you can inspect — arm it, and the platform sweeps it. **Agencies:** "nag if untouched," "expire after N days" — client policies as seeded timers, visible in the admin UI.

## In one sentence

`timers` turns "later" into a row with a next-fire time.

---

*Agent-facing chain now lives in `.framework/src/instructions/timers.md` — `## Problem it solves`.*
