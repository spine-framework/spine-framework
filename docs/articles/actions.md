---
title: "Why `actions` exists"
kind: narrative
verified_against: 9adea05
verified_on: 2026-11-13
extends: .framework/src/instructions/concepts/automation.md
source_files:
  - .framework/migrations/018_runtime_tables.sql
---

# Why `actions` exists

Pipelines invoke stage operations. Agents invoke tools. Schedules invoke jobs. All three need to know: *what can run, what arguments it takes, who it runs as, and what happens when it fails.* `actions` is the catalog where invocable operations become governed data.

## The five whys

1. **Why a registry of operations?** Pipelines (`pipeline-runner.ts`), agents (`agent-runner.ts` — tool calls), and schedules all invoke things — hardcoded handler paths per caller mean no validation, no discovery, no permission surface.
2. **Why `input_schema`/`output_schema`?** An invocable operation has a contract — callers, including AI agents picking tools, can't validate arguments or render results without declared shapes.
3. **Why `required_scopes` + `default_machine_principal_id`?** Actions run autonomously — they need a declared identity and permission envelope, or "the system did it" is unauditable and unscoped.
4. **Why `timeout_seconds` + `retry_count` per row?** Failure policy is per-operation — a sync lookup and an outbound integration need different retry semantics. That's config, not code.
5. **Root:** anything the platform invokes on its own must exist as governed data first — `actions` is the catalog where "things that can run" get schemas, identities, and failure policies.

## What it actually is

Defined in `.framework/migrations/018_runtime_tables.sql` (line ~15):

```sql
name, slug, handler, handler_module DEFAULT 'functions',
input_schema, output_schema, required_scopes text[],
default_machine_principal_id, timeout_seconds, retry_count
```

`resolve_machine_principal` in `principal.ts` reads this when a schedule or agent executes an action — the operation always runs as *someone declared*.

## How you'd use it

```json
// seed/actions.json
[{ "slug": "sync_inventory", "handler": "syncInventory",
   "input_schema": { "type": "object" },
   "required_scopes": ["inventory:write"], "retry_count": 2 }]
```

Then reference by slug from a pipeline stage, an agent tool list, or a `schedules` row.

## Who it's for

**Developers:** one registry answers "what can this system do?" — for pipelines, agents, and cron alike. **Agencies:** a client's automations run under declared identities with declared retry behavior — autonomous doesn't mean anonymous.

## In one sentence

`actions` is the governed catalog of things the platform can invoke.

---

*Agent-facing chain now lives in `.framework/src/instructions/concepts/automation.md` — `## Problem it solves`.*
