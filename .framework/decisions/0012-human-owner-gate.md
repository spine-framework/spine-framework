---
id: spine-framework:0012-human-owner-gate
title: threads.data.owner='human' is the human/agent gate — core never reads app-level statuses
status: accepted
kind: invariant
owner: package
since: 0.5.3
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/functions/_shared/agent-runner.ts
  - custom/apps/answer-once/hooks/useSupportThreads.ts
enforced_by: []
evidence:
  - { kind: source, ref: "agent-runner.ts isHumanOwned + claim ordering (~L7040–7110): gate reads a fresh threads row BEFORE the lease claim", label: source }
  - { kind: source, ref: "useSupportThreads.ts: human reply stamps threads.data.owner='human' via admin-data PATCH", label: source }
provenance: reconstructed
---

## Invariant

`threads.data.owner = 'human'` is THE semantic human/agent gate. While it is
set, no agent episode may be claimed, narrated, or run on that thread. It is
semantic ownership — orthogonal to the episode lease, which only governs who
may *write* right now. Both must be respected.

- **Core never gates on app-level item statuses** (`human_assigned`,
  `pending_resolution`, `human_action`, …). Core is domain-agnostic; an app
  translates its own workflow into the framework signal by stamping
  `threads.data.owner`.
- **Ordering matters**: the human-owner check runs BEFORE the episode lease
  claim and reads a fresh `threads` row — never the caller's `threadData`
  snapshot, which a frozen caller may have fetched before the handoff
  completed.

## Why (reconstructed)

Separating semantic ownership ("a human is handling this") from write
exclusion (the lease) lets a human hold a thread across page loads and
client restarts without holding a lease. The fresh-read ordering prevents a
stale snapshot from letting an agent claim a thread that was handed to a
human between the caller's fetch and the claim. The "fresh read" rationale
is inferred from the implementation; the gate itself is verified behavior.

## Source

Triage of CIL[DOC-NOTE]/[DOC-LEARNING] markers in agent-runner.ts (owner gate,
app-status caution, ordering) and answer-once useSupportThreads.ts. See
`docs/agents/note-triage-review.md` A1.
