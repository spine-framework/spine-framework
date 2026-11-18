---
title: "Why `alerts` exists (and why it doesn't, yet)"
kind: narrative
verified_against: d41b1d8
verified_on: 2026-11-13
extends: .framework/src/instructions/alerts.md
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Why `alerts` exists (and why it doesn't, yet)

This one is honest history. The `alerts` table was declared in the original schema — and nothing ever read or wrote it. It's one of two vestigial primitives in the framework (the other is `invites`), and its story is worth documenting precisely because "the table exists" and "the feature works" are different things.

## What the code actually does

- **`alerts` (001, dropped by 080):** generic config-table shape, RLS enabled, zero readers/writers — removed once the audit proved nothing touched it.
- **Alert-shaped output is synthesized:** `logs.ts` maps `logs` rows into alert objects (`metric`, `threshold_value`, `actual_value`) for the admin UI — display without storage.
- **`system-cron` read `threshold_alerts`** — a table *no migration defines* (archive-lineage residue; the query silently failed every tick). The dead path has been removed; threshold alerting was never implemented end-to-end.

## The five whys (of the intended capability)

1. **Why would alerting need a table?** Threshold rules are declarations — "when error rate > X, fire pipeline Y" — data, not code.
2. **Why declarable rules?** Alert tuning is operations, not development — operators need to adjust thresholds without a deploy.
3. **Why evaluate in cron rather than on-write?** Metrics are time-windowed (error rate *over 5 minutes*) — evaluation is periodic, not event-driven. That's `system-cron`'s job.
4. **Why fire a pipeline on breach?** Response is automation — alert → notify → escalate is exactly what pipelines are for; the alert row just needs the binding.
5. **Root:** alerting is observability with a trigger — rules as data, evaluated periodically, responded to via the same automation machinery as everything else.

## The lesson

Schema declarations are intent, not implementation. Two tables (`invites`, `alerts`) and one ghost reference (`threshold_alerts`, code path since removed) survived because nothing enforced "a table must have a consumer." The primitives index now records which tables are vestigial — and a real alerting implementation would start by defining the rule table properly, not by reusing `alerts` blindly.

## In one sentence

`alerts` proves the difference between declaring a capability and building one.

---

*Agent-facing notes live in `.framework/src/instructions/alerts.md`.*
