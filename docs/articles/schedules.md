---
title: "Why `schedules` exists"
kind: narrative
verified_against: 9adea05
verified_on: 2026-11-13
extends: .framework/src/instructions/timers.md
source_files:
  - .framework/migrations/018_runtime_tables.sql
---

# Why `schedules` exists

Cron runs have no human actor — but their writes still need identity, scope, and auditability. `schedules` binds the `actions` registry to calendar time under a declared `machine_principal_id`, closing the loop: autonomous execution is always attributable.

## The five whys

1. **Why a second scheduler when `timers` exists?** Different granularity — `timers` are app-declared jobs; `schedules` (migration `018`) binds a registered *action* to a cron expression with explicit ownership.
2. **Why `action_id` binding?** The schedule inherits the action's schemas, scopes, machine principal, and retry policy — it reuses the contract instead of re-declaring it.
3. **Why `machine_principal_id`?** Cron runs have no human actor. `resolve_machine_principal` (in `principal.ts`) reads it — falling back to `actions.default_machine_principal_id` — so every scheduled write is attributable.
4. **Why `next_run_at`/`last_run_at` + `schedule_executions`?** Same durable-state pattern as timers and pipeline executions — a crashed run is visible, a duplicate is a constraint violation.
5. **Root:** recurring platform work must carry its own identity — `schedules` binds the action registry to calendar time under a machine principal.

## What it actually is

Defined in `.framework/migrations/018_runtime_tables.sql` (line ~26):

```sql
account_id, action_id NOT NULL, name, schedule_type,
cron_expression, next_run_at, last_run_at,
machine_principal_id, ownership, is_system
```

`schedule_executions` logs each run (status, `input_params`, `output_result`, `duration_ms`, error) — the audit half of the loop.

## Companion: `schedule_executions`

The run log for scheduled actions — inherited why: unattended execution must be inspectable.

## How you'd use it

```tsx
// seed/schedules.json
[{ "action_slug": "sync_inventory", "name": "Nightly sync",
   "schedule_type": "cron", "cron_expression": "0 3 * * *" }]
```

## Who it's for

**Developers:** cron is a binding, not a deployment — schedule an existing action and it runs under its declared principal with per-run logging. **Agencies:** every unattended job on a client's system has a name, an owner identity, and a run history — nothing anonymous in production.

## In one sentence

`schedules` is cron with an identity and a paper trail.

---

*Agent-facing chain now lives in `.framework/src/instructions/timers.md` — `## Problem it solves`.*
