---
title: "Why `logs` exists"
kind: narrative
verified_against: 94ecb46
verified_on: 2026-11-13
extends: .framework/src/instructions/logs.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `logs` exists

A governed platform can't have unobserved writes. Every function, every automation, every actor — `logs` is the single append-only trail that makes "what happened, where, and who did it" a query instead of archaeology.

## The five whys

1. **Why a table instead of `console.log`?** Scattered logs aren't queryable — "what happened to this record in this account" needs structured rows, not stdout.
2. **Why one table instead of per-feature tables?** Cross-cutting questions (everything in account X around time T) are impossible when each feature logs differently.
3. **Why `level` + `context`/`metadata`?** Logs must be filterable and forensically rich — severity for noise control, structured context for "what exactly happened" without parsing strings.
4. **Why `account_id` + `created_by`?** Audit is attribution — the tenant boundary applies to observability data, and who triggered it is the whole point.
5. **Root:** a governed platform can't have unobserved writes — `logs` is the single append-only trail that makes every action attributable and queryable.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (~line 225): `level`, `message`, `context`, `metadata`, `account_id`, `created_by`.

Everything funnels through `_shared/audit.ts`: `emitAudit` (typed events with entity/type/result) and `emitLog` — handlers, pipeline stages, agent steps, security events (`security.registration_blocked`), all land in one place. `logs.ts` serves the admin UI, including alert-shaped projections.

## Who it's for

**Developers:** audit is a shared helper, not a per-feature decision — emit and it's scoped, attributed, and queryable. **Agencies:** every client system has a complete trail — "who changed what and when" is always answerable, for support and compliance alike.

## In one sentence

`logs` is the one place the whole system admits what it did.

---

*Agent-facing chain now lives in `.framework/src/instructions/logs.md` — `## Problem it solves`.*
