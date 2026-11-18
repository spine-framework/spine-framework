---
id: spine-framework:0016-vestigial-schema-cleanup
title: Vestigial and ghost schema — document, don't build on; drop in a future cleanup migration
status: accepted
kind: decision
owner: package
since: 0.6.0
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/migrations/001_core_schema.sql
  - .framework/functions/system-cron.ts
  - .framework/functions/logs.ts
  - docs/archive/0.6.1/spine-framework-documentation/reference/primitives/runtime/invites.md
  - docs/archive/0.6.1/spine-framework-documentation/reference/primitives/runtime/alerts.md
enforced_by: []
evidence:
  - { kind: doc, ref: "docs/spine-framework-documentation/reference/primitives/runtime/invites.md — public.invites has zero readers/writers; real invites are pending people rows with data.invite_token", label: observed }
  - { kind: doc, ref: "docs/spine-framework-documentation/reference/primitives/runtime/alerts.md — public.alerts unused; system-cron's dead threshold_alerts path removed", label: observed }
  - { kind: commit, ref: "b8e9495 — batch 7 docs documenting alerts as vestigial and threshold_alerts as a ghost", label: source }
  - { kind: commit, ref: "3b5a7de — dead threshold_alerts path removed from system-cron", label: source }
  - { kind: audit, ref: "2026-11-30 repo + live-DB verification: zero .from()/entity= callers on invites/alerts/integration_routes; no seeds or types rows; migrations only ever alter the tables themselves; 0 rows on spine-dev/AO prod/AO demo; no views, inbound FKs, cross-table policies, or function bodies referencing them (handle_new_auth_user mention is comment-only)", label: observed }
  - { kind: commit, ref: "d41b1d8 — 080_vestigial_table_drops.sql landed; dependency-guarded drops, no CASCADE", label: source }
  - { kind: audit, ref: "2026-11-13 apply + verify: 080 ledgered on all three projects; invites/alerts gone everywhere; integration_routes residue found on AO prod as well as spine-dev (both converged); demo's was already absent via 004; apply-time guard confirmed zero dependents on each database", label: observed }
provenance: captured
---

## Context

The primitives documentation effort (docs/articles + reference 5-whys, commits `6ab1f37`–`b62b5a5`) verified every `public` table against code. Three tables are dead or hollow:

- `public.invites` (`001` ~line 285): zero readers/writers. The real invite lifecycle lives on `people` rows (`data.invite_token`) via `invites.ts` + the `complete_registration_placement` RPC (052).
- `public.alerts` (`001` ~line 305): zero readers/writers. Alert-shaped admin output is synthesized from `logs` rows in `logs.ts`.
- `public.threshold_alerts`: **never created by any migration**; `system-cron.ts` used to query it — a dead code path (PostgREST error swallowed by cron every tick), since removed. Archive-lineage residue; no table exists to drop.
- `public.integration_routes`: created by `001`, deliberately dropped by `004` for `webhook_handlers`, but **still present on live spine-dev** — live drift, not a schema question.

## Decision

1. **Document, don't build on.** The vestigial tables get honest reference pages (done) — agents and humans are told not to model features on them.
2. **Drop in a future cleanup migration** (separate approval): `DROP TABLE invites, alerts` — unless a real alerting implementation is commissioned first, in which case define the rule table properly rather than reusing `alerts` (its generic-registry shape doesn't fit metric-threshold semantics). The `threshold_alerts` query path in `system-cron` was already removed as pure dead code (no table exists, so no migration is needed for it).
3. **Spine-dev `integration_routes` residue** is an ops cleanup, not a schema change — drop the table on that database only, matching committed migration 004.

## Alternatives rejected

- **Implement alerting now.** Real alerting is real work (rule table, evaluation windows, pipeline binding); the ghost path shouldn't be revived half-lit. If commissioned, it's a new design, not a resurrection.
- **Drop silently without records.** Table drops are destructive; they need a migration + this record + release notes, not a manual `DROP TABLE`.
- **Leave undocumented.** The whole point of the audit was that "table exists" ≠ "feature works"; the docs now say so at every touchpoint.

## Consequences

- Two drop-able tables remain live but harmless (RLS enabled, no writers).
- The `threshold_alerts` cron path is gone — the per-tick `Failed to fetch thresholds` log noise is eliminated.
- A future cleanup migration must check dependents before dropping and note the vestigial history in its header.
