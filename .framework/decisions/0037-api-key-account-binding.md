---
id: spine-framework:0037-api-key-account-binding
title: api-keys create accepts account_id for system principals only
status: accepted
kind: decision
owner: package
since: 0.10.4
until: null
supersedes: null
superseded_by: null
links: [spine-framework:0036-internal-machine-principal-writes]
applies_to:
  - .framework/functions/api-keys.ts
  - .framework/functions/_shared/principal.ts
enforced_by:
  - .framework/tests/unit/api-keys-create-scope-gate.test.ts
evidence:
  - { kind: report, ref: "downstream build 2026-11-26 (factory-1 G-005): a Factory-style worker registry needed to mint an sk_ key bound to a per-environment child account; create stamped ctx.accountId unconditionally, so a system principal could not bind a key to any account but its own", label: observed }
provenance: captured
---

## Context

`api-keys` `create` stamped `account_id: ctx.accountId` unconditionally. A
system principal — `system_admin`, or an unbound internal machine
(`isInternal && !accountId`) — could mint wildcard/internal keys but could
not bind a key to another account. Downstream, an orchestration app that
separates environments into child accounts had no API path to mint a
worker key scoped to the environment's account; the only options were
direct DB writes or running workers under a shared account, losing
account-level isolation.

## Decision

`create` accepts an optional `account_id` in the request body. Passing an
`account_id` different from `ctx.accountId` is allowed only when
`isSystemPrincipal(ctx)` — the same boundary already used for
`is_internal`/`*:*` minting (S-011) and for record-write bypasses
(decision 0036). The target account must exist (404 otherwise); a
non-system caller naming another account gets 403. Omitting
`account_id`, or passing the caller's own, is unchanged.

## Alternatives rejected

- **A dedicated mint endpoint per orchestration use-case**: duplicates
  key-minting logic (hash, prefix, scopes, audit log) for one extra
  parameter; the system-principal gate is already the established
  cross-account boundary.
- **Allow any account-bound caller to mint into child accounts of its
  own**: account hierarchy semantics do not exist on `accounts` today;
  inventing them here for one caller's topology couples the endpoint to
  a model nothing else implements.
- **Direct `admin-data` insert of `api_keys` rows by the caller**: skips
  hashing/normalization/audit that `create` centralizes — the row would
  carry a plaintext `key_value` and no `api_key.created` log.

## Consequences

- A system principal can bootstrap account-scoped machine keys for
  managed environments without DB access.
- The surface stays narrow: `account_id` is privilege-bearing like
  `is_internal` and `*:*` — same gate, same 403 for non-system callers.
- An account-bound machine key inherits that account's RLS scope for
  `ctx.db`; binding, not the caller, determines data reach.
