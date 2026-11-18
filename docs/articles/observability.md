---
title: "Why `observability` exists"
kind: narrative
verified_against: 3b5a7de
verified_on: 2026-11-13
extends: .framework/src/instructions/observability.md
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Why `observability` exists

`logs` answers "what happened." Metrics answer "how much, how fast, how often" — and those are different questions with different shapes. `observability` stores measurable signals as queryable series inside the same governed boundary.

## The five whys

1. **Why separate from `logs`?** You can't chart `metric_value` out of a message string — numeric series need their own shape.
2. **Why `metric_name`/`metric_value`/`metric_unit`?** Metrics must be named, numeric, and unit-tagged — the structure charts and threshold checks consume.
3. **Why in the governed schema?** Metrics are account-scoped tenant data — error rates and latencies differ per tenant; external-only metrics lose the account dimension.
4. **Why `context`/`metadata`?** A metric without dimensions (which function, which span) is a number with no debugging value.
5. **Root:** "is the system healthy" is a data question — `observability` keeps measurable signals queryable where the rest of the governed data lives.

## What it actually is

Defined in `001` (~line 232): `metric_name`, `metric_value`, `metric_unit`, `context`, `metadata`, `account_id`. Producers include `agent-runner` (episode metrics ~line 5593) and `observability.ts`; `system-cron`'s (now removed) `threshold_alerts` path showed the intended consumer: periodic metric evaluation.

## Who it's for

**Developers:** emit a metric row, and it's account-scoped, timestamped, and queryable — health dashboards are queries, not integrations. **Agencies:** per-client performance is tenant-scoped data — you can see one client's latency without building a metrics backend.

## In one sentence

`observability` is where "how the system is doing" becomes governed, queryable data.

---

*Agent-facing chain now lives in `.framework/src/instructions/observability.md` — `## Problem it solves`.*
