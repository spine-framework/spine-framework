---
title: "Why Answer Once exists"
kind: narrative
verified_against: 781dcbd
verified_on: 2026-11-22
source_files:
  - docs/articles/spine-framework.md
---

# Why Answer Once exists

Support teams answer the same questions forever — and the effort never compounds. Each resolved ticket evaporates into history, invisible to the next customer asking the same thing. The expensive part of support isn't answering. It's that the answer doesn't stick.

Answer Once exists because support should be a system that learns — knowledge compounds and effort decreases.

## The five whys

1. **Why doesn't resolution effort compound?** Resolved answers live in ticket history — invisible to the next customer asking the same question.
2. **Why isn't resolution captured?** "Answer and move on" is the incentive; turning a resolution into reusable knowledge is extra work nobody owns.
3. **Why can't a knowledge base alone fix it?** KBs rot — articles get written once, go stale, retrieval quality untested. Agents can't trust what they can't warrant.
4. **Why do AI support tools fall short?** They're bolted on: they answer from retrieval but don't participate in the governed loop — no permissions, no audit, and no path for a human resolution to become the next answer's source.
5. **Root:** support is a flywheel waiting to be closed — *ask → AI answers from KB → miss escalates to human → human resolution becomes KB → the next identical question is instant.* A system that learns: knowledge compounds and effort decreases. Every question should cost a human once.

## Every piece of the loop is a Spine Framework primitive

This is the strongest demonstration of the framework's claims — the entire product is declarations on governed primitives, not bespoke machinery:

- **The conversation** — `threads` + `messages`: polymorphic, sequenced, visibility-aware conversation attached to the ticket record.
- **The ticket** — `types` + `items`: `support_ticket` is a declared type with fields, views, and permissions in `design_schema`.
- **The agents** — `ai_agents` + `prompt_configs`: triage and solution personas are seeded rows — model, tools, and prompt are governed config.
- **The routing** — directives: admin-authored rules executed via `apply_routing_directive` — reply, tag, watch, escalate, or fire a pipeline.
- **The escalation** — `watchers` + `notifications`: when confidence drops, the loop routes to humans; watching and notifying are primitive behaviors.
- **The knowledge** — `ao_kb_article` + `embeddings` + `document_leases`: resolutions ingest into a governed, account-scoped, content-hash-deduped retrieval index.
- **The review gate** — change markers → human review → publish (`ao_kb-review`): knowledge enters the KB *reviewed*, not auto-promoted — the same warrant discipline as everything else.
- **The concurrency** — `episode_leases`: one driver per agent episode, token-fenced, expiry-bounded.
- **The audit** — `logs`, `pipeline_executions`, `trigger_executions`: every step of the loop is attributable.

## How you'd use it

```bash
npm create @spine-framework/answer-once
```

The installer scaffolds a project, migrates the database, and seeds the app — types, roles, pipelines, agents, prompts, directives. A working learn-as-it-answers support system, without the plumbing. Then:

- Customers submit tickets (or ask directly); the triage agent routes, the solution agent answers from the KB.
- Misses escalate with watchers attached; a human resolves.
- Reviewed resolutions publish as KB articles — retrieved on the next ask.

## Who it's for

**Support leaders:** the system gets cheaper per question over time — volume grows, headcount doesn't have to. **Developers:** the entire loop is inspectable declarations — extend it by seeding, not by forking. **Agencies:** a deployable, ownable support product per client — same governed foundation, client-specific seeds.

## In one sentence

Answer Once closes the loop so every question costs a human exactly once.

---

*Companion to the framework article: `docs/articles/spine-framework.md`. Primitive mechanics are linked above; each has its own article.*
