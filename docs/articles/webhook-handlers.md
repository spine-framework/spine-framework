---
title: "Why `webhook_handlers` exists"
kind: narrative
verified_against: dfb657b
verified_on: 2026-11-13
extends: .framework/src/instructions/integrations.md
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Why `webhook_handlers` exists

Inbound webhooks need dispatch: which function handles this event? The first answer was `integration_routes` — a static table that required a platform change per handler. Migration `004` dropped it and replaced it with this: a self-registration registry where apps declare their own handlers as data.

## The five whys

1. **Why a registry instead of a static route table?** Static routes mean platform edits per app handler — `integration_routes` was exactly that; `004` dropped it as dead schema for this registry.
2. **Why self-registration?** Custom functions register themselves (`function_name` + `events[]` via `_shared/webhook-registration.ts`) — discoverable at runtime, no central file, no import graph crossing the core/custom boundary.
3. **Why `UNIQUE(app_id, account_id, name)` + `events` GIN index?** Handlers are app/account-scoped and matched by event — `webhook-registry.ts` `resolveHandler` resolves by name/app/account with caching. Dispatch is a lookup, not a switch statement.
4. **Why `is_deleted` soft-delete?** Unregistering shouldn't erase the audit of what was registered when deliveries arrived.
5. **Root:** extensibility can't flow through core code — `webhook_handlers` makes inbound handlers discoverable data, so apps extend the integration surface without touching the framework.

## Companion: `webhook_deliveries`

The delivery ledger (004) — every inbound receipt and outbound send is a row with a status lifecycle (`pending → processing → delivered/failed/cancelled`), retry state (`attempt_count`, `next_attempt_at`), and forensic payload (`external_id`, `response_*`). `deliveries.ts` redrives failures; manual retry is outbound-only and permission-checked. It exists because async external I/O must be durable and inspectable — the same reason `pipeline_executions` exists.

## What it actually is

```sql
-- webhook_handlers (004):
app_id, account_id, name, function_name, events text[],
UNIQUE (app_id, account_id, name)
```

`integration-routes.ts` resolves the handler via the registry on each inbound webhook, records a `webhook_deliveries` row, and invokes the function.

## Who it's for

**Developers:** new inbound handler = register + write the function — the dispatch, ledger, and retry already exist. **Agencies:** a client's integration surface extends without framework patches — handlers are discoverable data.

## In one sentence

`webhook_handlers` makes inbound dispatch a lookup, not a code change.

---

*Agent-facing chains now live in `.framework/src/instructions/integrations.md` and `runtime/webhook-deliveries.md` — `## Problem it solves`.*
