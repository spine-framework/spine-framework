---
title: "Why `prompt_configs` exists"
kind: narrative
verified_against: f6aed7f
verified_on: 2026-11-13
extends: .framework/src/instructions/prompts.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `prompt_configs` exists

What you tell the model *is* behavior — and it changes more often than code does. `prompt_configs` makes prompts governed data: editable in admin, seeded per app, resolvable at runtime without a deploy.

## The five whys

1. **Why prompt rows instead of strings in code?** Prompts are edited constantly — code-bound prompts mean redeploys for wording and no audit of what the model was told.
2. **Why `config` + consistent variable naming?** Prompts need templating (`{{ticket}}`, `{{history}}`) — declared config and shared conventions let agents share structure without forking strings.
3. **Why `UNIQUE(app_id, slug)`?** Prompts are app vocabulary — seeded, versioned per app, overridable per account.
4. **Why separate from `ai_agents`?** Persona vs text evolve independently — one agent can A/B prompts; one prompt can serve multiple agents.
5. **Root:** what you tell the model *is* behavior — `prompt_configs` makes prompts governed data: editable in admin, seeded per app, resolvable at runtime without a deploy.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (~line 196) — generic config-table shape (`UNIQUE(app_id, slug)`). Resolved by the agent runner per episode; `config` holds template text, variable bindings, and retrieval directives (including `available_tools` — persisted configs use `fetch_document`; the legacy `cil_fetch_document` alias maps in the runner for old data). <!-- lint-allow: literal legacy alias name, still mapped in agent-runner.ts -->

## How you'd use it

```json
// seed/prompt-configs.json
[{ "slug": "triage_default", "name": "Triage",
   "config": { "system": "You are a triage agent for {{account}}...",
               "available_tools": ["fetch_document"] } }]
```

## Who it's for

**Developers:** prompt edits are data writes — versioned in seeds, tunable in admin, auditable. **Agencies:** a client's agent voice is a row they can see and we can seed — not a code patch.

## In one sentence

`prompt_configs` makes the model's instructions governed, editable data.

---

*Agent-facing chain now lives in `.framework/src/instructions/prompts.md` — `## Problem it solves`.*
