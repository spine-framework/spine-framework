---
title: "Stop Rebuilding the Foundation"
kind: narrative
verified_against: 9df54f8
verified_on: 2026-11-17
source_files:
  - package.json
  - .framework/mcp/index.ts
  - .framework/templates/agent/AGENTS.md
  - .framework/cli/index.ts
  - LICENSE.md
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
  - "Owner decision S7 (2026-11-16): this page is canonical discovery source; the marketing site's Devin retrieves and copies it"
---

# Stop Rebuilding the Foundation

### Why Spine Framework exists

Every business application begins the same way: months of foundation work before it delivers anything specific to its domain. Accounts and tenancy. Users, roles and permissions. Record models. Workflows and automation. Audit trails. And now AI agents that need to act on all of it.

That foundation is also where the costliest failures happen: data leaking between tenants, permission gaps, writes nobody can trace, and agents that can do things their users never could.

Spine Framework exists because this foundation keeps being rebuilt, and every rebuild brings the same risks back.

## The five whys

**1. Why does every application rebuild the foundation?**
Every app needs the same base layer: tenancy, identity, roles, permissions, records, workflows, automation, audit and agents. Each team builds its own version from scratch.

**2. Why can't the foundation be reused?**
The domain gets written into the code. A "ticket" or a "deal" becomes its own table, its own handlers, its own permission checks, its own UI, and its own agent integration. Once the foundation and the domain are tangled together, you can't share one without forking the other.

**3. Why hasn't existing tooling solved this?**
It sits at the wrong level. Infrastructure (databases, auth, hosting) is generic but too low-level, so it leaves the business layer to you. SaaS and low-code platforms work at the right level, but you don't own them and can't safely extend them. AI tooling has the same split: model APIs are too low-level, and closed agent platforms are walled gardens.

**4. Why is the middle layer hard to build?**
To be generic, the runtime has to read the domain from data instead of hardcoding it. Types, schemas, permissions, workflows and agents all have to be stored as rows. It also has to enforce security at the database, not in each app's code. And agents must go through the same gates as humans, or they become the easiest way around them. Getting generic and secure together is hard, and a mistake leaks across every app at once.

**5. The root cause**
There is no owned, secure, generic layer between infrastructure and application. So every team re-derives the foundation, agents included, and every re-derivation carries the same risks.

## Spine Framework's answer

Spine Framework is that middle layer. Its governing principle: **the core provides mechanism; your app provides data.**

- **Shared primitives instead of rebuilt foundations.** Accounts, people, roles, apps, types, records, threads, messages, links, pipelines, triggers, timers, AI agents and prompt configurations all ship as framework primitives.
- **The domain lives in data, not code.** The core knows nothing about tickets, deals or posts. Apps declare their types in a design schema covering fields, views, permissions and behavior, and the runtime interprets it generically.
- **One governed write path.** Every runtime record goes through a single endpoint that applies validation, permissions, triggers and audit. Agents use the same path, so an agent can never do what its role couldn't.
- **The database is the last line of defense.** Row-level security protects every tenant table, whatever the application layer does.
- **You own it.** The code and the infrastructure (your own Supabase project and your own deployment) are yours. Extensions live in a separate custom workspace without forking the core.
- **Fixes reach every app.** The core never imports app code, so framework upgrades, including security fixes, apply to every app built on it.

## Who it's for

**Developers** get a foundation they would otherwise spend months building and then maintain forever. They start at the domain instead of the plumbing.

**Agencies and consultancies** get one foundation for many client apps. Each client app is mostly declarations, not a fresh codebase, and an improvement or security fix made once in Spine Framework reaches every client.

## Fit — and honest non-goals

**A good fit when** you're building a business application — internal tools, client portals, support desks, workflow apps, multi-tenant SaaS — on a conventional stack and you'd rather write your domain than your plumbing. Especially when an AI coding agent is doing some of the writing: the framework ships the rules, procedures, and instruction book an agent needs to work safely.

**Not the right layer when** you need a hosted turnkey product (Spine deploys to *your* Supabase and Netlify — you own and run it), a marketing site or CMS (it's business applications and admin surfaces, not publishing), realtime-first collaboration (no realtime transport ships), or native mobile (the shell is a React SPA).

## Spine vs. building directly on Supabase

Supabase is the infrastructure Spine runs on — Postgres, GoTrue auth, PostgREST, row-level security. Directly on Supabase you still build the business layer yourself: a record model your apps share, a permission engine, an admin UI, automation primitives, audit logging, and a governed path your agents can use without bypassing everything. Spine *is* that business layer, pre-built and enforced — types, views, and permissions as data; RLS as the last line; one endpoint every write goes through.

## Ownership and licensing

Your deployment is yours: your Supabase project, your Netlify site, your `custom/` code. Licensed under Apache 2.0 — free for any use, including commercial software products.

## How a fix reaches every client app

Framework code never imports app code; apps consume the core through declared contracts (`@core/*` imports, `/api/admin-data`, `design_schema`). That means a security fix or upgrade in the core propagates to every app built on it — for an agency, a fix lands once and every client project gets it via `npx spine-framework upgrade`.

## See it working

The fastest proof is a real app: `npm create @spine-framework/answer-once@latest` scaffolds framework plus Answer Once — a working customer-support product (tickets, knowledge base, AI-assisted triage) running on your own stack in one step. `npm create spine-framework@latest` gives the bare framework.

## For AI agents

Spine is designed to be developed on *by* agents. After `init`, a project gives your agent:

- **`AGENTS.md`** — the standing rules: `.framework/` is sealed (upgrades overwrite it), all runtime-record CRUD goes through `/api/admin-data` (no custom wrappers), schema changes go through migrations only, `record_permissions` keys must match `roles.slug` verbatim.
- **`.devin/skills/spine-*`** — shipped procedures: install, new type/app/automation, test, ship, operate, troubleshoot.
- **`.framework/src/instructions/`** — a full instruction book (guide, concepts, tasks, reference, entity pages) the agent reads while it works.
- **A CLI** (`npx spine-framework …`) for scaffolding, validation, migration, bootstrap, health checks — scriptable end to end.

Evaluating fit: if your task is a business app on Supabase/Netlify and the agent will spend real time in it, the agent-facing surface is a first-class feature here — not bolted on. Support channel: support.spine-framework.com.

## In one sentence

Spine Framework is an owned, secure, generic foundation, so business applications start at their domain instead of their plumbing.
