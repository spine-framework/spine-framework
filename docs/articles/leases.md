---
title: "Why leases exist (`episode_leases` + `document_leases`)"
kind: narrative
verified_against: f6aed7f
verified_on: 2026-11-13
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Why leases exist (`episode_leases` + `document_leases`)

Exactly-once is the hardest promise a platform makes. An agent episode appends messages; a document ingest writes chunks and embeddings — both are long-running, side-effecting work where a second concurrent driver means corruption. The lease tables persist the claim in the database itself. This is Spine Way rule #11 made concrete — two tables, one idea.

## The five whys

1. **Why lease tables at all?** Long-running side-effecting work must have exactly one driver — two concurrent drivers double-write, double-embed, or contradict each other mid-conversation.
2. **Why atomic claims instead of read-then-write?** Read-then-write races under concurrency — the claim is `INSERT ... ON CONFLICT` or a conditional `UPDATE` in one statement.
3. **Why `lease_token`/`lease_id` + `expires_at`?** The token fences writes — a stale holder's write fails the check (a fence, not an error); expiry means a crashed driver's lease lapses instead of deadlocking.
4. **Why heartbeats?** Liveness is proved by renewing the claim, not by a process being alive — `agent-runner` refreshes the episode lease per turn and stamps the token into checkpoint state.
5. **Root:** exactly-once semantics can't come from coordination logic alone — leases persist the claim in the database, fenced by tokens and bounded by expiry, so supervisors recover by watching persisted state, not trusting responses.

## The two instances

**`episode_leases`** (migration `064`): `thread_id` PK — one driver per agent episode. Held by `agent-runner` for the whole conversation turn cycle; fenced writes include thread-data merges and escalations.

**`document_leases`** (migration `054`): `document_id` PK + `content_hash` — the claim doubles as dedup: same content = no work, so "in progress" and "unchanged" share one atomic row. Acquired by `kbIngest`, cleared by `kbRevoke`.

## The pattern, reusable

When you build long-running side-effecting work: claim atomically → heartbeat → write with the token → release. A failed token check is a fence, not an error. Never read-then-write.

## Who it's for

**Developers:** concurrency bugs in long-running work are designed out at the schema level — copy the pattern for your own multi-step jobs. **Agencies:** unattended work can't double-run silently — every claim is a visible row with an expiry, so a stuck job is observable rather than mysterious.

## In one sentence

Leases make "only one driver" a database constraint, not a hope.

---

*Agent-facing chains now live in `.framework/src/instructions/concepts/concurrency-and-idempotency.md` and `document-leases.md` — `## Problem it solves`.*
