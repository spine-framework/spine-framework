---
title: "Why `ai_agents` exists"
kind: narrative
verified_against: f6aed7f
verified_on: 2026-11-13
extends: .framework/src/instructions/ai-agents.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `ai_agents` exists

A "triage agent" and a "solution agent" aren't code — they're declarations: a model, a prompt binding, a tool envelope, behavior knobs. `ai_agents` makes the agent itself governed data, so what runs autonomously is seeded, scoped, and editable in admin.

## The five whys

1. **Why agent rows instead of hardcoded agents?** Personas, models, and tool envelopes change per app and per deployment — code-bound agents mean redeploys for tuning.
2. **Why `config` JSONB instead of columns?** Agent configuration is open-ended — tool lists, model params, retrieval policy — a document per agent beats a column per knob.
3. **Why `UNIQUE(app_id, slug)` + `type_id`?** Agents are domain vocabulary — app-declared, seeded, upgradable like every config primitive.
4. **Why data-driven agents?** The agent runner is generic — it resolves agent row → prompt config → tool envelope per episode. One runner, many personas, zero per-agent code.
5. **Root:** AI behavior is the newest layer of "domain as data" — `ai_agents` makes the agent itself a governed declaration.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (~line 275) — the generic config-table shape (`app_id`, `slug`, `config`, `metadata`, `UNIQUE(app_id, slug)`). `config` carries the substance: model selection, tool allowlist, prompt binding, retrieval policy.

The runner (`agent-runner.ts`) resolves the agent row per episode, reads its `actions` as callable tools (line ~1387), and drives under an episode lease (see `episode_leases`).

## How you'd use it

```json
// seed/ai-agents.json
[{ "slug": "triage", "name": "Triage Agent",
   "config": { "model": "...", "prompt_config_slug": "triage_default",
               "tools": ["fetch_document", "apply_routing_directive"] } }]
```

## Who it's for

**Developers:** a new agent is a seed row + a prompt config — the runner, tools, and lease fencing already exist. **Agencies:** the agent's behavior is a config diff — tune the persona without shipping code to the client's deployment.

## In one sentence

`ai_agents` makes "who the agent is" governed data.

---

*Agent-facing chain now lives in `.framework/src/instructions/ai-agents.md` — `## Problem it solves`.*
