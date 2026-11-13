---
id: spine-framework:0011-applied-migration-correction-065
title: Applied/published migrations are immutable — the 065 guard edit was a one-off corrective, not precedent
status: accepted
kind: invariant
owner: package
since: 0.5.5
until: null
supersedes: null
superseded_by: null
links:
  - answer-once:0002-packaged-artifact-install-contract
applies_to:
  - custom/migrations/065_answeronce_triage_directives.sql
  - custom/migrations/
  - .framework/migrations/
enforced_by:
  - scripts/db-fixtures.ts
evidence:
  - { kind: fixture, ref: "db:fixtures P-recover — dirty 0.2.10 install recovered by 0.2.11 tarball on published 0.5.5 seedApp", label: fixture }
  - { kind: query, ref: "_spine_migrations on spine-dev / AO prod / demo all show 065 applied 2026-11-06..10 (original content)", label: observed }
  - { kind: source, ref: "_spine_migrations tracks filename only — no checksum column; applied files never re-run", label: source }
provenance: captured
---

## Context

Applied and published migrations are treated as immutable: a migration file
is a historical record of what ran, and databases track it by filename.
Editing an applied file creates a divergence between what the file says and
what executed — and downstream installers treat diverged migrations as fatal
drift.

In Nov 2026, migration `065_answeronce_triage_directives.sql` was edited
*after* it had already been applied to all three persistent databases
(spine-dev, AO prod, demo) via the monorepo path. This record exists so the
exception is not read as permission.

## The correction

Original guard (applied everywhere):

```sql
WHERE NOT EXISTS (
  SELECT 1 FROM public.types
  WHERE slug = 'ao_triage_directive' AND kind = 'item'
    AND app_id = (SELECT id FROM public.apps WHERE slug = 'answer-once')
);
```

Corrected guard (shipped in AO 0.2.11):

```sql
WHERE NOT EXISTS (
  SELECT 1 FROM public.types
  WHERE slug = 'ao_triage_directive' AND kind = 'item'
);
```

**Why it was necessary:** `065` had never shipped inside any npm package —
`installer/migrations/` carried only 062/063. The only orderings it ever ran
under were migrate-first. On the seed-first ordering (the only state a
0.2.10-era customer could produce: seed inserts types app_id-less, then the
package's migrations run), the owner-scoped guard could not see the
seed-inserted row → `types_kind_slug_unique` violation → the migration died
→ `make_scenario` (066) never ran → the recovery seed could never complete.
The published recovery path was unrecoverable. Because the file's first
publication was AO 0.2.11, correcting it before publication was strictly
better than shipping a migration known to fail on a real ordering.

## Why this is safe — and why safety was verified, not assumed

- `_spine_migrations` tracks **filename only**; the edit cannot trigger a
  re-run on applied databases. (Mechanism, not justification.)
- All applied databases hold the identical end state the new guard produces
  (the row exists; both guards skip).
- No distributed artifact carried the old file — downstream projects contain
  only 062/063, so installer drift-abort cannot fire on it.
- Verified across: clean install (P-cand-0.5.0–0.5.5), dirty-install
  recovery (P-recover), registry artifact (P-reg).

## Invariant

**Do not edit applied or published migrations.** The correct tool for a
defect in an applied migration is a new corrective migration — unless, as
here, the file has never been distributed, the change is needed *before*
first publication, and the semantic difference is verified across every
install ordering the artifact supports. "The runner won't notice" is never
a sufficient reason.
