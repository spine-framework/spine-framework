---
id: spine-framework:0019-sunset-cortex-portal-workbench
title: sunset cortex, portal, and workbench — remove code, soft-off app rows, leave data inert
status: accepted
kind: decision
owner: package
since: 0.6.1
until: null
supersedes: null
superseded_by: null
links: [spine-framework:0001-admin-data-only, spine-framework:0017-sophisticated-simplicity]
applies_to:
  - spine.config.json
  - public/spine.config.json
  - .framework/public/spine.config.json
  - .framework/functions/_shared/webhook-registry.ts
  - scripts/boundary-check.sh
  - .framework/scripts/boundary-check.sh
  - scripts/db-fixtures.ts
  - custom/migrations/071_sunset_apps_soft_off.sql
enforced_by:
  - scripts/boundary-check.sh
  - .framework/tests/unit/decision-records.test.ts
evidence:
  - { kind: doc, ref: "docs/archive/0.7.0/docs-skills-realignment.md Phase 4 — D7 requires full removal from code, config, tests, docs, skills with gate + db:fixtures green", label: source }
  - { kind: doc, ref: "Owner direction 2026-11-14: leave data inert — soft-off app rows, do not delete seeded types or runtime records", label: source }
  - { kind: source, ref: "apps.is_active is the platform's existing reversible off-switch; runtime record 'remove' semantics already flag rather than delete", label: source }
provenance: captured
---

## Context

Cortex, Portal, and Workbench were dogfood-era apps superseded by
`answer-once` (the production product) and `demo` (the guided learning
demo). Cortex additionally carried the retired CIL surface (removed by
migration 079), a Cortex-local re-implementation of `admin-data` that
violated `0001-admin-data-only`, and a hardcoded escalation path into
Workbench. Portal's only unique contribution was the instance claim flow.
Workbench was an internal engineering tracker whose lineage semantics
(`workbench_originated_from`) were a cross-app dependency once embedded in
core `admin-data` (since removed — the cortex discovery audit's claim is
already stale at removal time).

## Decision

Remove `custom/apps/{cortex,portal,workbench}` entirely — code, pages,
functions, seeds, skills (`custom/archive-devin/` Workbench skills, the
Workbench `.devin/AGENTS.md`), tests whose subject was the deleted code,
config entries in all three `spine.config.json` copies, the
`custom_portal-signals` inbound loader, and denylist terms in both
`boundary-check.sh` copies.

Deployed data is left **inert, not deleted**: migration 071 soft-offs the
three app rows (`UPDATE apps SET is_active = false WHERE slug IN
('workbench','portal','cortex') AND is_active;`) plus the automation rows
that would invoke deleted functions — app-scoped `webhook_handlers`,
`pipelines`, `triggers`, and the global `portal-signals` handler seeded by
framework migration 004. Idempotent, reversible, a no-op where the apps
were never installed. Seeded types are left fully
untouched including their `is_active` flag: types are globally unique on
`(kind,slug)`, runtime records carry stamped `type_id` + `design_schema`
snapshots, and flipping or deleting them can orphan live references.
Runtime records and historical migrations remain intact. App-owned
migrations stay in migration history (applied migrations are immutable).

Test coverage was audited per-file: `runtime-isolation`/`analytics` used
the app names as arbitrary fixture strings and were renamed to synthetic
slugs; `invites-security`/`core-isolation`/`answer-once-ui` retargeted to
`demo`/`answer-once`; `support-triage-finalize` tested portal-specific
finalize divergence (portal keeps a retrieval child `in_progress`; demo
stamps `ai_resolved`) that has no surviving equivalent — it was deleted
with its subject, demo semantics already covered by demo's own tests.

## Alternatives rejected

- **Delete the rows** — irreversible, orphans runtime-record references,
  can violate FKs, and npm removal cannot reach already-deployed
  databases anyway. Cleanup, if ever wanted, is a separate owner-approved
  decision, not a bundled side-effect.
- **Deactivate the seeded types too** — types are global shared shapes;
  a flipped flag can surprise record creation if a future app reuses a
  slug. The apps rows are the only safe mark.
- **Keep the trees dormant** — dead app code still compiled, still
  shipped denylist noise, and still taught agents retired patterns
  (CIL, the admin-data fork, Workbench lineage).

## Salvaged findings (kept from the discovery audits)

- `.framework/migrations/010_dogfood_apps.sql` seeds legacy `crm` and
  `customer-portal` apps that duplicate the removed apps — known
  duplication in immutable history; the soft-off migration covers any
  deployed rows under those slugs too? No — those slugs are distinct
  (`crm`, `customer-portal`) and equally inert by policy; flagging for a
  future owner-approved cleanup decision rather than expanding scope.
- `044_update_workbench_types.sql` adds `cortex_ticket_id` to Workbench
  types — cross-app history, harmless now both sides are gone.
- The cortex-local `admin-data` fork is the cautionary evidence behind
  `0001-admin-data-only`: a copied handler drifts from the shared
  permission, type-resolution, audit, and trigger logic.
