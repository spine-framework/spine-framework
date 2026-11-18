---
title: "Why `_spine_migrations` exists"
kind: narrative
verified_against: 94ecb46
verified_on: 2026-11-13
extends: .framework/src/instructions/reference/database.md
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Why `_spine_migrations` exists

Reproducibility requires memory. "Which migrations has this database seen?" has to be an answerable question — or every migrate replays everything, and "is this DB the shape we think it is?" becomes guesswork.

## The five whys

1. **Why a ledger?** Migrations must be idempotent-*checked* — the system needs to know what already ran.
2. **Why filenames?** Ordered, human-readable identity (`NNN_description.sql`) — the ledger doubles as "what lineage built this database," which is exactly what you reach for when schema drift appears.
3. **Why created by tooling, not a migration?** It must exist before the first migration runs — it can't be row 001 of the thing it tracks. Bootstrap chicken-and-egg: the CLI creates it on first run.
4. **Why service-role-only?** The ledger is infrastructure — PostgREST exposure would leak platform internals; tenants have no business in migration history (046 RLS).
5. **Root:** reproducibility requires memory — the ledger is the smallest possible "what is true about this database's lineage" record, deliberately dumb so every tool that touches it can agree.

## What it actually is

Not defined in any numbered migration — the migrate CLI and `apply-single-migration.mjs` run `CREATE TABLE IF NOT EXISTS _spine_migrations (filename ...)` before applying. `046` pins RLS to service-role-only.

During the 079 release it was the forensic surface that mattered: ledger rows revealed which lineage each project had, where surgical vs. normal application happened, and where historical out-of-band application left gaps (075/076 applied without rows).

## Who it's for

**Developers:** "has NNN run here?" is one query — fixtures, surgical hotfixes, and drift debugging all start there. **Agencies:** each client database's lineage is inspectable — upgrades can verify state instead of assuming it.

## In one sentence

`_spine_migrations` is the database's memory of how it got its shape.

---

*Agent-facing chain now lives in `.framework/src/instructions/reference/database.md` — `## Problem it solves`.*
