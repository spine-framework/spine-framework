---
title: "Why `system_settings` exists"
kind: narrative
verified_against: 6ab1f37
verified_on: 2026-11-13
extends: .framework/src/instructions/reference/database.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `system_settings` exists

Some behavior — log levels, feature flags, tool defaults — needs to change at runtime, without redeploying code. `system_settings` is the platform's narrow channel for that.

## The five whys

1. **Why not environment variables?** Env changes require a redeploy, and scoped overrides — one account with louder logging, one tool's default — can't exist in env at all.
2. **Why not `apps.config`?** These toggles are cross-app, platform-owned, and runtime-scoped. The codebase shows the distinction in practice: analytics config was deliberately placed in `apps.config` *because it ships with the app*; `system_settings` is for what doesn't.
3. **Why scoped instead of a flat map?** Operability. "Turn debug logging on for *this* account" is the common case in production — a flat toggle is all-or-nothing.
4. **Why is it so lightly used?** Because most config legitimately lives elsewhere — types, apps, seeds. `logging.ts` is the only live reader today; that's the design working, not an oversight.
5. **Root:** a platform needs a narrow, scoped channel for behavior that changes at runtime without code deploys; everything else belongs in schema or app config.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (line ~627):

```sql
scope text NOT NULL DEFAULT 'global',  -- global | app | account | source | principal | tool
scope_id text,
key text NOT NULL,
value jsonb NOT NULL DEFAULT '{}'
```

Two partial unique indexes enforce `(key, scope, scope_id)` when `scope_id` is set and `(key, scope)` for global rows. `_shared/logging.ts` resolves effective log levels through it per scope.

## How you'd use it

Rarely. When you need a framework-wide toggle read at runtime — e.g., raising log verbosity for one source or account without a deploy:

```ts
adminDb.from('system_settings')
  .upsert({ key: 'logging', scope: 'account', scope_id: accountId, value: { level: 'debug' } })
```

If the config belongs to an app and ships with it, use `apps.config` or seeds instead.

## Who it's for

**Developers:** an operational escape hatch, not a config system — reach for it when scope + runtime mutability are both required. **Agencies:** lets you tune a client's environment (log levels for one account) without shipping code to their deployment.

## In one sentence

`system_settings` is the one place where runtime scope, not deploy-time config, decides behavior.

---

*Agent-facing chain now lives in `.framework/src/instructions/reference/database.md` — `## Problem it solves`.*
