---
id: spine-framework:0033-atomic-mutation-doctrine
title: Runtime-record atomicity ships as admin-data conditional mutations (claim/cas/insert-once); project RPCs on items are the documented escape hatch, not the pattern
status: accepted
kind: decision
owner: package
since: 0.10.2
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/functions/admin-data.ts
  - .framework/migrations/
  - .framework/src/instructions/concepts/concurrency-and-idempotency.md
  - .framework/src/instructions/reference/api/admin-data.md
enforced_by:
  - .framework/tests/unit/admin-data-atomic.test.ts
evidence:
  - { kind: report, ref: "downstream project build review 2026-11-25: inventory reservation, edition allocation, idempotent create, and status-claim all required UPDATE…WHERE/atomic ops admin-data cannot express; the project wrote five custom SECURITY-invoker RPCs mutating public.items directly — bypassing validation_schema, field permissions, triggers, and audit", label: observed }
  - { kind: source, ref: "framework precedent exists: rate_limit_hit, merge_thread_data, episode leases — 'the database decides' via atomic statements, but only inside core", label: source }
provenance: captured
---

## Context

"The database decides" is Spine's concurrency doctrine — but the doctrine
only had implementations inside core. Projects needing atomic conditional
mutation on runtime records (inventory counters, allocation, idempotent
create, status claims) had no surface: admin-data offers read-then-write
CRUD only. A downstream project proved the need is real and generic — its
five RPCs were all the same shapes: conditional counter move, row-locked
range allocation, claim-if-status, advisory-locked insert-if-absent.

## Decision

Ship three first-class mutations on `admin-data` for `items`:

- `action=claim` — `WHERE id AND status = <from>` → set `status = <to>`
  (+ optional `data` patch). The pipeline-execution claim pattern made
  generic. Empty result = lost the race.
- `action=cas` — `WHERE id AND <data path> <op> <value>` → apply a
  `data` patch atomically. Covers counter moves
  (`reserved_qty + n <= edition_qty` via server-side arithmetic ops
  `lt/ lte/gt/gte/eq/neq` on `(data->>'x')::int + n`).
- `action=insert_once` — idempotent create keyed by a caller-chosen
  dedupe value, advisory-locked so check+insert is one logical op.

Permissions are evaluated as for `update`/`create` on the record — CAS
does not widen the grant, it makes an already-permitted write atomic.

Project-defined RPCs on runtime tables remain legal (custom migrations
are sanctioned) but are documented as the escape hatch — with the
mandatory grant hygiene (`REVOKE EXECUTE FROM PUBLIC, anon,
authenticated`; `GRANT … TO service_role`) since PostgREST exposes them
at `/rest/v1/rpc/` under the anon key.

## Alternatives rejected

- **Bless project RPCs as the pattern**: every app re-derives the same
  five functions, each bypassing validation/permissions/audit, each a
  fresh anon-key exposure to remember to revoke. Doctrine that requires
  bespoke SQL per app is not doctrine.
- **Optimistic-read + application retry**: racy by construction; the
  downstream project proved it insufficient under parallel checkout.

## Consequences

- The record layer carries the invariant; app code no longer escapes to
  bespoke SQL for the common atomic shapes.
- `admin-data.md` + `concurrency-and-idempotency.md` document the
  actions and when project RPCs are still legitimate.
