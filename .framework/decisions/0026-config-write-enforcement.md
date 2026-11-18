---
id: spine-framework:0026-config-write-enforcement
title: second-surface config writes — enforce system_admin on timers/triggers
status: accepted
kind: decision
owner: package
since: 0.7.0
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/functions/timers.ts
  - .framework/functions/triggers.ts
  - .framework/functions/_shared/permissions.ts
  - .framework/migrations/081_second_surface_write_rls.sql
  - .framework/src/instructions/concepts/permissions.md
enforced_by:
  - .framework/migrations/081_second_surface_write_rls.sql
  - .framework/tests/unit/config-write-enforcement.test.ts
evidence:
  - { kind: doc, ref: "timers.ts had no permission check on create/update/remove/toggle; triggers.ts gated only create — update/remove/toggle relied on ctx.db RLS", label: observed }
  - { kind: doc, ref: "migration 042 *_access policies scoped timers/triggers to account membership only — any account member could write via /api or direct PostgREST", label: observed }
  - { kind: doc, ref: "concepts/permissions.md three-surface table: second-surface config writes are system_admin full access / everyone else denied", label: observed }
  - { kind: doc, ref: "machine principals get ctx.db = service role (RLS bypass) — documented in operations/security-checklist.md known ungated surfaces", label: observed }
provenance: captured
---

## Context

The second-surface row in `concepts/permissions.md` declares config objects
(`timers`, `triggers`, `apps`, `pipelines`, `roles`, `types`, …) as
"`system_admin` full access; machine principals read-only; everyone else
denied." Endpoint reality diverged:

- `roles` writes held the line — migration `045` made writes
  system-admin-only at RLS.
- `triggers` `create` was engine-gated but `update`/`remove`/`toggle` had
  no gate.
- `timers` had no gate anywhere; the account-scoped `timers_access` RLS
  policy was the only bound.
- Net effect: any account *member* — not just `system_admin` — could arm a
  timer that fires pipelines or delete triggers, via `/api/*` or direct
  PostgREST, while being able to read those rows back only as `{ id }`
  stubs.

## Decision

**Enforce the documented policy** (adjudicated 2026-11-17, option A):
second-surface config writes on `timers` and `triggers` require
`system_admin`.

- `timers.ts` `create`/`update`/`remove`/`toggle` and `triggers.ts`
  `update`/`remove`/`toggle` now deny non-admins through
  `canAccessRecord`'s second-surface check (`canAccessConfigObject`:
  `system_admin` writes; internal machines read-only; everyone else
  denied) — the same engine policy the docs describe.
- Migration `081` splits the 042 `FOR ALL` account-scoped policies into
  account-scoped `SELECT` + `system_admin`-only writes (mirroring the `045`
  `roles` fix), so direct PostgREST writes match the API.

## Alternatives rejected

- **Accept tenant-member config writes** — downgrade `permissions.md` to
  "config objects are account-scoped." Rejected: it would make arming a
  pipeline-firing timer or deleting triggers a member-level event, not an
  admin-level one.
- Machine-principal service-role access stays documented and is out of
  scope — tightening `*:*` keys is its own decision.

## Consequences

- Non-admin members can no longer write `timers`/`triggers` via `/api/*`
  or PostgREST — they need `system_admin`. No custom code in this repo
  writes them (checked `custom/`); the admin UI runs as system_admin.
- **Residual surface:** `pipelines`, `ai_agents`, `prompt_configs` (and
  `embeddings` create/update) share the same ungated-write shape this
  record fixed for timers/triggers — the same adjudication should be
  applied to them as follow-up. `integrations` deliberately uses an
  `account_admin` model instead and is a separate call.
