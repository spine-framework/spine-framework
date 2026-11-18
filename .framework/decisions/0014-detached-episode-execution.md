---
id: spine-framework:0014-detached-episode-execution
title: Detached episode mode + client watch-then-step supervisor is the designed execution model, not a workaround
status: accepted
kind: decision
owner: package
since: 0.4.0
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - custom/apps/demo/lib/agent-steps.ts
  - .framework/functions/_shared/agent-runner.ts
enforced_by: []
evidence:
  - { kind: source, ref: "mode:'episode' detaches the complete-mode loop and returns immediately; step mode drives multi-turn episodes via /api/ai-agents?action=run", label: source }
  - { kind: runtime, ref: "netlify dev / lambda-local returns 500 after ~30s while the function keeps executing and persists messages — observed behavior", label: observed }
provenance: reconstructed
---

## Decision

Multi-turn agent episodes run in **step mode** — the client steps the episode
via `runAgent`/`/api/ai-agents?action=run` so no multi-turn run ever exceeds
the single-request function timeout. `mode:'episode'` exists for
fire-and-forget kicks: it detaches the complete-mode loop inside the function
process and returns immediately.

**On real Lambda the process freezes after the response flushes** — a
detached chain does not keep running. The client's watch-then-step
supervisor (poll persisted messages, re-kick on stall) is therefore the
designed fallback, not a hack to remove.

Corollaries:

- An HTTP timeout/error never kills server-side work — the function may
  still be persisting messages after the 500. Progress is judged from
  persisted thread messages, never from the HTTP response.
- Finalize has a two-write window: the detached finalize writes the
  envelope first and the summary seconds later. `hasEnvelope && !stamped`
  does NOT mean finalize failed — wait `FINALIZE_GRACE_MS` from envelopeAt
  before kicking, and never re-kick `'finalized'` on envelope-without-summary.

## Why (reconstructed)

Serverless platforms offer no portable detached execution; the supervisor
model makes multi-turn episodes survive single-request timeouts on every
deployment target. The freeze-after-flush behavior is platform-observed, not
documented intent.

## Source

Triage of markers in demo `agent-steps.ts`/`useDemoJourney.ts`, cortex
`useAgentSteps.ts`, `custom_demo-triage.ts`, `custom_case_analysis.ts`,
`custom_support-solution.ts`. See `docs/agents/note-triage-review.md` A3.
