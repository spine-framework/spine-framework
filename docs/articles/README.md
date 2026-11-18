---
title: "Spine Framework articles"
kind: narrative
verified_against: d41b1d8
verified_on: 2026-11-13
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Spine Framework articles

Human-readable "why it exists" articles for the framework and every primitive — the long-form counterpart to the `## Why it exists` chains now living in the shipped instruction book (`.framework/src/instructions/**`). Articles are the narrative; the book is the source of truth agents read at edit time.

## Framework

| Article | Subject |
|---|---|
| [spine-framework.md](spine-framework.md) | Why Spine Framework exists (positioning) |
| [epistemic-layering.md](epistemic-layering.md) | What the agentic IDE is missing (observed/asserted/inferred) |
| [answer-once.md](answer-once.md) | Why Answer Once exists (support as a learning system) |

## Schema & apps

| Article | Primitive(s) | Book page |
|---|---|---|
| [types.md](types.md) | `types` | .framework/src/instructions/types.md |
| [apps.md](apps.md) | `apps` | .framework/src/instructions/apps.md |
| [link-types.md](link-types.md) | `link_types` | .framework/src/instructions/runtime-collaboration.md |
| [system-settings.md](system-settings.md) | `system_settings` | .framework/src/instructions/reference/database.md |

## Runtime records

| Article | Primitive(s) | Book page |
|---|---|---|
| [items.md](items.md) | `items` | .framework/src/instructions/concepts/runtime-records.md |
| [threads.md](threads.md) | `threads` | .framework/src/instructions/runtime-collaboration.md |
| [messages.md](messages.md) | `messages` | .framework/src/instructions/runtime-collaboration.md |
| [links.md](links.md) | `links` | .framework/src/instructions/runtime-collaboration.md |
| [attachments.md](attachments.md) | `attachments` | .framework/src/instructions/runtime-collaboration.md |
| [watchers.md](watchers.md) | `watchers` | .framework/src/instructions/runtime-collaboration.md |
| [item-progress.md](item-progress.md) | `item_progress` | .framework/src/instructions/concepts/runtime-records.md |

## Identity & tenancy

| Article | Primitive(s) | Book page |
|---|---|---|
| [accounts.md](accounts.md) | `accounts` (+`account_paths`) | .framework/src/instructions/accounts.md | .framework/src/instructions/concepts/scope-and-accounts.md |
| [people.md](people.md) | `people` | .framework/src/instructions/people.md |
| [roles.md](roles.md) | `roles` | .framework/src/instructions/roles.md |
| [invites.md](invites.md) | `invites` (vestigial, dropped by 080; mechanism = pending `people` rows) | .framework/src/instructions/invites.md |

## Automation

| Article | Primitive(s) | Book page |
|---|---|---|
| [pipelines.md](pipelines.md) | `pipelines` (+`pipeline_executions`) | .framework/src/instructions/pipelines.md |
| [actions.md](actions.md) | `actions` | .framework/src/instructions/concepts/automation.md |
| [triggers.md](triggers.md) | `triggers` (+`trigger_executions`) | .framework/src/instructions/triggers.md |
| [timers.md](timers.md) | `timers` | .framework/src/instructions/timers.md |
| [schedules.md](schedules.md) | `schedules` (+`schedule_executions`) | .framework/src/instructions/timers.md |

## AI

| Article | Primitive(s) | Book page |
|---|---|---|
| [ai-agents.md](ai-agents.md) | `ai_agents` | .framework/src/instructions/ai-agents.md |
| [prompt-configs.md](prompt-configs.md) | `prompt_configs` | .framework/src/instructions/prompts.md |
| [embeddings.md](embeddings.md) | `embeddings` | .framework/src/instructions/kb.md |
| [leases.md](leases.md) | `episode_leases` + `document_leases` | .framework/src/instructions/concepts/concurrency-and-idempotency.md |

## Integrations & API

| Article | Primitive(s) | Book page |
|---|---|---|
| [integrations.md](integrations.md) | `integrations` | .framework/src/instructions/integrations.md |
| [webhook-handlers.md](webhook-handlers.md) | `webhook_handlers` (+`webhook_deliveries`); `integration_routes` dead schema | .framework/src/instructions/integrations.md | .framework/src/instructions/deliveries.md |
| [api-keys.md](api-keys.md) | `api_keys` (+`api_key_usage_logs`) | .framework/src/instructions/api-keys.md |

## Notifications & security

| Article | Primitive(s) | Book page |
|---|---|---|
| [notifications.md](notifications.md) | `notifications` | .framework/src/instructions/notifications.md |
| [alerts.md](alerts.md) | `alerts` (vestigial, dropped by 080; `threshold_alerts` ghost path removed) | .framework/src/instructions/alerts.md |
| [rate-limits.md](rate-limits.md) | `rate_limits` | .framework/src/instructions/security.md |
| [security-blocklist.md](security-blocklist.md) | `security_blocklist` | .framework/src/instructions/security.md |

## Observability, testing, internal

| Article | Primitive(s) | Book page |
|---|---|---|
| [logs.md](logs.md) | `logs` | .framework/src/instructions/logs.md |
| [observability.md](observability.md) | `observability` | .framework/src/instructions/observability.md |
| [test-cases.md](test-cases.md) | `test_cases` (+`test_runs`, `test_results`) | .framework/src/instructions/testing.md |
| [_spine-migrations.md](_spine-migrations.md) | `_spine_migrations` | .framework/src/instructions/reference/database.md |

## Conventions

- Each article ends with a pointer to its reference page; each reference page's `## Problem it solves` links back to the article.
- Chains are labeled *confirmed* (user-signed root) or *inferred* (agent reconstruction). All current roots are confirmed as of 2026-11-13.
- Vestigial tables (`invites`, `alerts` — both dropped by 080) and dead schema (`integration_routes`, `threshold_alerts`) are documented as such — do not model features on them.

## Retrieval contract — for the marketing site's Devin

The pages below are the canonical **discovery source** — pull and copy
them into the site project (retrieval, not linking; owner decision S7).
Each is self-contained: no relative links that would break when rendered
outside this repo.

**Transport:** `docs/articles/` ships inside the `spine-framework` npm
package (see `files` in `package.json`), so the canonical pages are
reachable via the public mirror raw URL —
`https://raw.githubusercontent.com/spine-framework/spine-framework/main/docs/articles/<page>.md`
— or by unpacking the published tarball. The monorepo remains the source
of truth; the mirror/package is the retrieval surface.

| Page | Pull for | Last verified |
|---|---|---|
| `docs/articles/spine-framework.md` | Site landing: what it is, who it's for, fit/non-goals, vs Supabase, licensing, demo path, "For AI agents" (→ `llms.txt`) | `verified_against`/`verified_on` in its frontmatter |
| `docs/articles/answer-once.md` | The Answer Once product story | same |
| `docs/articles/epistemic-layering.md` | The agentic-IDE rationale, for engineering audiences | same |

Rules for the pull:

- **Re-pull when a page's `verified_against`/`verified_on` changes** — the
  GitHub release notes (written by the `release` skill) flag discovery-page
  changes, so a release is the natural re-pull cue.
- **Do not resolve relative links** — if a pulled page gains one, treat it
  as a page bug and flag it back here; the convention is self-containment.
- Claims marked `asserted_by` are positioning (reviewed, not code-derived);
  claims backed by `source_files` are code-verified — keep the distinction
  when excerpting.

### Second surface — the developer docs section

For a **docs section** (not marketing copy), the source is the shipped
instruction book: `.framework/src/instructions/` (~125 pages — `guide/`,
`concepts/`, `tasks/`, `operations/`, `reference/`, plus entity pages).
It also ships in the package, so the same transport applies
(`node_modules/spine-framework/.framework/src/instructions/` or the
mirror raw URL).

Rules for that pull:

- **Mirror the whole tree, preserving directory structure** — pages
  cross-link relatively (`../concepts/x.md`); remap `.md` links to your
  site routes when rendering.
- **Exclude `internal/`** — meta-docs for maintainers, not users. A few
  pages link into it; rewrite those links or drop them.
- Strip frontmatter but keep the page — `verified_against`/`verified_on`
  are your re-pull cues.
- Backticked paths like `.framework/src/...` or `custom/apps/...` refer to
  the consumer's project tree — correct to show verbatim; do not rewrite.

**Render path (owner decision 2026-11-17): pre-render to static HTML.**
The site's agent converts each `.md` to a `.html` page per pull —
pandoc/marked or hand-rendered — committed into the site. Notes for that
path:

- Rewrite `.md` links → `.html` (or your route scheme) at render time;
  rewrite or drop links pointing into `internal/`.
- Preserve the provenance stamps — an HTML comment carrying
  `verified_against`/`verified_on` per page keeps the re-pull cue alive.
- Render deterministically (stable templates, no timestamps in output)
  so each pull produces reviewable diffs in the site repo.
