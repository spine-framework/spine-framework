---
id: spine-framework:0020-open-security-surface
title: three audit findings remain open — machine scopes on admin-data, fail-closed defaults, placeholder-credential fail-fast
status: accepted
kind: decision
owner: package
since: 0.6.1
until: null
supersedes: null
superseded_by: null
links: [spine-framework:0019-sunset-cortex-portal-workbench]
applies_to:
  - .framework/functions/admin-data.ts
  - .framework/functions/_shared/principal.ts
  - .framework/functions/_shared/rate-limit.ts
  - .framework/functions/_shared/db.ts
enforced_by: []
evidence:
  - { kind: doc, ref: "docs/archive/0.6.1/security-audit.md — 2026-08 audit; resolution table verified against code at e271544", label: source }
  - { kind: source, ref: "machineHasScope is exported from _shared/principal but never called in admin-data.ts — machine-scoped API keys receive full adminDb", label: source }
  - { kind: source, ref: "rate-limit.ts: fail_closed opt-in per policy; db.ts: PLACEHOLDER_URL/PLACEHOLDER_KEY used instead of failing fast", label: source }
provenance: captured
---

## Context

The 2026-08 security audit (archived at `docs/archive/0.6.1/security-audit.md`
with a per-finding resolution table) was triaged during Phase 5 of the
docs/skills realignment. Every critical and high finding verified resolved by
migration 075, migration 076, or existing code gates. Three items remain
genuinely open:

1. **M1 — machine scopes unenforced on `admin-data`** (medium, confirmed).
   `machineHasScope` exists in `_shared/principal.ts` but nothing calls it on
   the admin-data path: a narrowly-scoped machine API key still receives
   `adminDb` and can reach second/third surfaces (`types` including
   `design_schema`, `links`, `logs`) cross-account, and insert rows with a
   forged `account_id`. First-surface rows are minimized by
   `sanitizeRecordData`, which limits — not eliminates — the exposure.
2. **M3 — rate limiting is fail-open by default** (low/medium).
   `fail_closed` is opt-in per policy. The audit's recommendation stands for
   cost-bearing actions (agent steps, embeddings): default those policies to
   fail-closed so a rate-limit outage can't run up LLM spend.
3. **M12 — placeholder credentials degrade silently** (low).
   `_shared/db.ts` constructs clients with `PLACEHOLDER_URL`/`PLACEHOLDER_KEY`
   when env vars are missing; a misconfigured deploy degrades instead of
   failing fast. Replacing with a thrown error changes cold-start failure
   modes — worth doing deliberately, not as a drive-by.

## Decision

These are tracked here rather than left as prose in an archived audit: fixing
each is a deliberate change with blast radius (M1 narrows what existing keys
can do; M3 changes outage behavior; M12 changes cold-start). Each fix should
ship with its own test and a follow-up `until`/supersession note on this
record.

## Alternatives rejected

- **Fold into prose in the archive** — archived files are inert; open
  findings must stay visible to the release gate.
- **Fix in the same phase** — out of scope for a docs-archival phase; each
  needs its own test.
