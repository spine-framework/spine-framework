---
id: spine-framework:0022-dead-path-contracts
title: dead-path code contracts are documented as unreachable, not activated
status: accepted
kind: decision
owner: package
since: 0.7.0-rc.1
until: null
supersedes: null
superseded_by: null
links: [spine-framework:0017-sophisticated-simplicity, spine-framework:0018-docs-and-skills-lock-step]
applies_to:
  - .framework/functions/_shared/llm.ts
  - .framework/functions/system-cron.ts
  - .framework/functions/_shared/middleware.ts
  - .framework/src/instructions/reference/functions/system-cron.md
enforced_by: []
evidence:
  - { kind: source, ref: ".framework/functions/_shared/llm.ts — ctx.integration precedence branch populated by no caller (verified 2026-11-16; grep for `.integration =` finds only the reads)", label: source }
  - { kind: source, ref: ".framework/functions/_shared/middleware.ts:236-244 — anonymous principals 401 before handler code runs; system-cron's ?api_key= check is unreachable for unauthenticated callers", label: source }
  - { kind: source, ref: "cleanroom-e GAP_LOG 2026-11-16 — cold agent attributed both paths as live contracts, then corrected itself after tracing call sites", label: source }
provenance: captured
---
# 0022 — Dead-path contracts: document as unreachable, don't activate

## Decision

Two code paths that *read* as live contracts are dead — deliberately left
dead, with their real behavior documented and the trap marked inline:

1. **`ctx.integration` model precedence in `llm.ts`** — `callOpenAIChat` /
   `callOpenAIEmbeddings` resolve `ctx?.integration?.config?.models.*`
   above the caller's model, but no call site populates `ctx.integration`.
   The real chain is `model_config.model || LLM_DEFAULT_MODEL || default`.

2. **`?api_key=` scheduler-key auth in `system-cron`** — the handler
   checks the query param against `SCHEDULER_API_KEY`, but `createHandler`
   rejects anonymous principals upstream, so an unauthenticated
   `?api_key=` call can never reach it.

The resolution is **document and mark, not activate**:

- `llm.ts` carries an inline comment on the dead branch naming the real
  chain and warning against "fixing" docs to claim the override.
- `system-cron.md` documents that the `api_key` path still requires a
  resolved non-anonymous principal.

## Why not activate them

- **Activating `models.chat` precedence is a silent behavior change, not
  a fix.** The seeded `openai` integration pins `gpt-4o-mini`; making the
  branch live would flip every seeded install's agent model overnight.
  If integration-level model override is ever wanted, it is a designed
  feature (who sets `ctx.integration`, precedence docs, migration of
  seeded configs) — not a docs correction.
- **Opening an anonymous `api_key` path weakens the auth boundary** for a
  convenience path that already has a safe equivalent (`x-internal-secret`
  → internal machine principal). The principal requirement is the
  fail-closed posture; the query key is belt-and-suspenders on top.

## The generalizable lesson

A conditional that reads as a contract may never execute. Re-verifying a
doc claim against code must check **who sets the input**, not only who
reads it — presence ≠ reachability. Both a cold agent and a reviewer
independently misattributed live behavior to dead paths here (the
reviewer shipped a wrong doc fix that the agent's correction reversed).
The `docs-sync` skill now states the reachability rule explicitly.

## Alternatives considered

- **Activate the model override** — rejected: silent production behavior
  change on every seeded install; the override was never a shipped
  contract (docs always described `model_config.model` first).
- **Remove the dead branches** — rejected for now: `ctx.integration` is a
  reasonable extension point, and removal is riskier than marking during
  an rc window. Revisit when an integration-resolution caller is designed.
- **Anonymous `api_key` via an `allowAnonymous` `createHandler` option** —
  rejected: widens attack surface to preserve a convenience path that has
  a working safe equivalent.
