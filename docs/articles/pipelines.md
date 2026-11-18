---
title: "Why `pipelines` exists"
kind: narrative
verified_against: 9adea05
verified_on: 2026-11-13
extends: .framework/src/instructions/pipelines.md
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Why `pipelines` exists

"Validate the schema, notify Slack, transition the stage" — multi-step business logic that every app needs but no app should re-code. `pipelines` makes it declared data, executed by one runner, audited per run.

## The five whys

1. **Why a workflow table instead of chained function calls?** The same sequences get re-coded per app — same logic, N handlers.
2. **Why `stages` as data?** Declared stages are interpreted by `pipeline-runner.ts` — one executor for every app. (`stages` is a real column, reconciled in migration `020` after `001`'s generic-registry rebuild dropped it.)
3. **Why `UNIQUE(app_id, slug)` + `type_id`?** Pipelines are domain vocabulary — apps declare flows (triage, escalation) scoped to their app, typed like everything else.
4. **Why `pipeline_executions`?** "Did the workflow run, and what happened" must be inspectable — status, input/output, errors per run. Async workflows are unauditable without a durable log.
5. **Root:** automation is domain behavior, so it must be declarable like the rest of the domain — `pipelines` turns multi-step business logic into seeded data the platform executes and audits.

## What it actually is

`pipelines` in `001` (+ `stages` column via `020`); `pipeline_executions` logs each run (`status`, `input_data`, `output_data`, `error_message`, FK cascade on pipeline delete).

`pipeline-runner.ts` iterates stages and resolves stage actions against the `actions` registry (line ~289) — stage types include record ops, notifications (resolving `watchers` as recipients), integration calls, and `kb_ingest`/`kb_revoke` stages added by `054`.

## Companion: `pipeline_executions`

The run log — exists purely so "what did this pipeline do?" is a query. Covered here; its why is entirely inherited.

## How you'd use it

```json
// seed/pipelines.json
[{ "slug": "triage", "name": "Triage flow",
   "stages": [{ "type": "update_record", "config": { "status": "triaged" } }] }]
```

Bound to events via `triggers`; run history at `/api/pipeline-executions`.

## Who it's for

**Developers:** workflows are JSON, not orchestration code — and every run is debuggable. **Agencies:** client business logic ships as seed data — a new flow is a config diff, reviewable like any other declaration.

## In one sentence

`pipelines` makes "what should happen" data the platform runs and records.

---

*Agent-facing chain now lives in `.framework/src/instructions/pipelines.md` — `## Problem it solves`.*
