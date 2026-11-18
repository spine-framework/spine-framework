---
title: "Why `integrations` exists"
kind: narrative
verified_against: dfb657b
verified_on: 2026-11-13
extends: .framework/src/instructions/integrations.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `integrations` exists

Every app eventually talks to the outside — Slack, Make.com, payment providers, custom webhooks. Those connections are configuration: per-app declarations, per-account bindings, provider-specific shapes. `integrations` makes them governed data instead of code.

## The five whys

1. **Why integration rows instead of config in code?** Connections are per-app per-account — hardcoded means redeploys and secrets in code.
2. **Why `config`/`metadata` JSONB?** Every provider's shape differs — OAuth tokens, endpoints, feature flags; a document per integration absorbs the variance.
3. **Why `UNIQUE(app_id, slug)` + `type_id`?** Integrations are domain vocabulary — apps declare which services they connect; accounts bind instances.
4. **Why typed integrations?** A "Slack" connection and a "webhook" connection carry different schemas — same types-as-data pattern.
5. **Root:** external connectivity is configuration the platform must govern — `integrations` makes third-party connections declarable, scoped, and swappable instead of code-bound.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (~line 206) — generic config-table shape. `integrations.ts` provides governed CRUD; `integration-outbound.ts` consumes rows to execute outbound sends (writing `webhook_deliveries` ledger rows); `integration-routes.ts` handles inbound.

## How you'd use it

```json
// seed/integrations.json
[{ "slug": "make-scenario", "name": "Make.com scenario",
   "config": { "webhook_url": "...", "events": ["ticket.resolved"] } }]
```

## Who it's for

**Developers:** a new provider connection is a row + maybe a webhook handler — not new routing code. **Agencies:** client integrations are declared and account-bound — swap a provider by changing config, not code.

## In one sentence

`integrations` makes "who we talk to" declarable, scoped data.

---

*Agent-facing chain now lives in `.framework/src/instructions/integrations.md` — `## Problem it solves`.*
