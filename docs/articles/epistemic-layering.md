---
title: "What the agentic IDE is missing"
kind: narrative
verified_against: 6d4c39b
verified_on: 2026-11-15
source_files:
  - docs/agents/epistemic-layering.md
---

# What the agentic IDE is missing

An agent reads code perfectly and remembers nothing else. It knows the syntax, the APIs, the patterns — and starts every session as a new hire with none of the history. Not *why* the code is shaped this way. Not *what was tried and rejected*. Not *which constraints are load-bearing*. Not *what has actually been verified*. A senior human carries all of that between sessions. The agent doesn't — and nothing in the tooling supplies it.

## The five whys

1. **Problem:** agents confidently break hard-won invariants, repeat abandoned approaches, or re-derive context a colleague already established.
2. **Why?** They lack the reasoning around the code — the rejected alternatives, the constraints, the lessons. Code alone doesn't carry them.
3. **Why?** That knowledge lives in people's heads, chat histories, and session summaries — none of it where the agent looks at the moment it edits a file.
4. **Why?** The tooling assumes a human supplies continuity. Session context evaporates; "memory" features are loose notes with no source, no freshness, no link to the code they describe.
5. **Root:** nothing distinguishes **observed** from **asserted** from **inferred** — and nothing keeps knowledge true as the code changes. The missing piece isn't memory. It's *epistemics*: knowing the warrant behind each thing you act on.

## Why more memory isn't the answer

The first instinct is to give the agent more to remember: index the codebase, embed it, let it search. That's the path we walked — a code-intelligence layer that accumulated markers and annotations in a database. It fixed recall, not trust: generated content sat next to reviewed content undifferentiated, and stale retrieved text arrived sounding authoritative. More memory without provenance produces more confidently wrong context.

## What epistemic layering looks like

The repair separates the questions agents conflate:

- **What's true** — code and tests. Not annotation, not memory: the code itself, plus deterministic checks that re-derive facts (fixtures that replay migrations, install real packages, verify behavior end to end).
- **Why it's that way** — reviewed, hand-authored records: decision records with status lifecycles and `applies_to` triggers, agent docs maintained like code.
- **What we can prove** — evidence-labeled artifacts: fixture results carry `evidence:` labels; release provenance separates `observed` from `asserted`. Each claim knows its warrant.

Three properties make it hold up where an index didn't: **provenance** (generated content never poses as reviewed), **freshness** (the layer lives where the code lives, reviewed on change), and **enforcement** (validators and gates make untrue knowledge a build failure, not a suggestion).

## Who it's for

**Developers using AI tools:** the difference between a copilot that "knows your codebase" and one that *trusts its knowledge correctly* is this layer. **Anyone building agent tooling:** solve warrant before volume — an agent that knows which of its beliefs are earned is worth more than one with ten times the context.

## In one sentence

Agents don't need more memory — they need to know which of their beliefs are earned.

---

*Condensed agent-facing version lives in `docs/agents/epistemic-layering.md`.*
