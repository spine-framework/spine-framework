---
title: "Why `test_cases` exists"
kind: narrative
verified_against: 94ecb46
verified_on: 2026-11-13
extends: .framework/src/instructions/testing.md
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Why `test_cases` exists

Quality is data too. Evaluating search, embeddings, or agents needs stored ground truth — questions, expected answers, tiers — and outcomes need history. `test_cases`, `test_runs`, and `test_results` put evaluation in the governed schema so it's seedable, auditable, and trendable per app.

## The five whys

1. **Why test cases in the database?** Evaluation needs stored ground truth, seeded and versioned like other config — not hardcoded in test files that can't vary per app.
2. **Why typed + `UNIQUE(app_id, slug)`?** Test suites are domain vocabulary — each app's evals travel with its seeds.
3. **Why separate runs and results?** A run is an event (suite, counts, duration); results are per-case detail — the summary exists without a thousand rows, the detail exists only when needed.
4. **Why in-database instead of CI artifacts?** "Is this agent improving" is a trend query — CI logs expire; rows don't.
5. **Root:** quality is data too — test definitions and outcomes live in the governed schema so evaluation is seedable, auditable, and trendable per app/account.

## What it actually is

`test_cases` + `test_runs` in `001` (registry shape; `018` reconciled the archive runner columns — `suite`/`status`/counts — so both lineages work); `test_results` in `018`. `tests.ts` and `system.ts` read both layers.

## Companions: `test_runs` + `test_results`

The run event and per-case outcomes — covered here; their why is inherited: evaluation without history can't show a trend, and a summary without detail can't be debugged.

## Who it's for

**Developers:** evals are seeded config — a new ground-truth case is a row, and results accumulate queryably over time. **Agencies:** "did the client's agent get worse after the prompt change" is measurable — runs and results persist per account.

## In one sentence

`test_cases` makes quality measurable, seeded, and historical.

---

*Agent-facing chain now lives in `.framework/src/instructions/testing.md` — `## Problem it solves`.*
