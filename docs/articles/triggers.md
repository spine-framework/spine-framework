---
title: "Why `triggers` exists"
kind: narrative
verified_against: 9adea05
verified_on: 2026-11-13
extends: .framework/src/instructions/triggers.md
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Why `triggers` exists

Pipelines declare *what* runs. Something else must decide *when*. `triggers` is that seam — event bindings as data, so every write through the governed path is a potential event and no app needs platform code to react.

## The five whys

1. **Why separate from pipelines?** "What runs" and "when it runs" change independently — rebinding shouldn't mean editing the workflow.
2. **Why data instead of hardcoded `onCreate` handlers?** Event routing per app in code means platform edits per app. `admin-data` already fires `fireCreate/UpdateTriggers` after every governed write (the delete path fires nothing today) — declared triggers make reactivity config.
3. **Why `event_type` + `pipeline_id` + `config` conditions?** A trigger is a declarable rule: fire *this* pipeline when *this* event on *this* type matches *these* conditions. (The event/pipeline columns were reconciled in migration `020`.)
4. **Why `trigger_executions`?** "Why did that pipeline run?" is unanswerable without knowing which rule matched — the execution log is the debugging surface.
5. **Root:** reactivity needs a seam between event and action — `triggers` is that seam as data, so apps get event-driven behavior without platform code changes.

## What it actually is

`triggers` and `trigger_executions` in `001` (event columns via `020`). `_shared/trigger-engine.ts` resolves matching trigger rows post-write in `admin-data` and dispatches the bound pipeline.

## Companion: `trigger_executions`

Per-fire audit row — which trigger matched, status, input/output, error. Inherited why: exists so event-driven behavior is inspectable.

## How you'd use it

```json
// seed/triggers.json
[{ "slug": "on_ticket_create", "event_type": "create",
   "entity": "items", "type_slug": "support_ticket",
   "pipeline_id": "<triage-pipeline>", "config": { "conditions": {} } }]
```

## Who it's for

**Developers:** "when X happens, run Y" is a seed row — every write is already instrumented. **Agencies:** client automation rules are declared, inspectable, and auditable — no hidden event code.

## In one sentence

`triggers` is the data seam between events and pipelines.

---

*Agent-facing chain now lives in `.framework/src/instructions/triggers.md` — `## Problem it solves`.*
