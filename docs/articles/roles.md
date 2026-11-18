---
title: "Why `roles` exists"
kind: narrative
verified_against: 677f018
verified_on: 2026-11-13
extends: .framework/src/instructions/roles.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `roles` exists

Permissions need a name before they need enforcement. `record_permissions`, `required_roles`, `min_role`, and RLS policies all dereference the same vocabulary — `roles` is where that vocabulary lives, as data.

## The five whys

1. **Why role records instead of hardcoded roles?** Permission vocabularies are domain-shaped — a support app's roles aren't a CRM's — and hardcoding them freezes domain into core.
2. **Why `permissions` JSONB instead of join tables?** Role definitions are small, config-shaped, and read whole — one document answers "what can this role do?" better than N join rows.
3. **Why global `UNIQUE(slug)` with `app_id`/`account_id` columns?** Slugs resolve globally (`role_slug` lookups), but rows can be scoped — system roles platform-wide, app/account roles for domain vocabularies. (Same schema-vs-resolver asymmetry as `link_types`.)
4. **Why `is_system` + `is_protected`?** Framework roles (`system_admin`, `member`) must survive app churn — protected flags stop installs and seeds from rewriting the vocabulary the platform itself depends on.
5. **Root:** permissions need a name before they need enforcement — `roles` is the shared vocabulary that `record_permissions`, `required_roles`, `min_role`, and RLS policies all dereference.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (line ~61):

```sql
slug text NOT NULL UNIQUE, name text NOT NULL,
permissions jsonb DEFAULT '[]',
is_system boolean, is_protected boolean,
app_id uuid, account_id uuid
```

Consumed by: `design_schema.record_permissions` (per-role CRUD arrays), `apps.required_roles` / `min_role` (route gating), invite creation (`*_admin` check in `invites.ts`), and field-level permission overrides.

## How you'd use it

```json
// seed/roles.json
[{ "slug": "support_agent", "name": "Support Agent",
   "permissions": ["tickets:*", "kb:read"] }]
```

Then reference the slug in `design_schema.record_permissions` or `manifest.required_roles`.

## Who it's for

**Developers:** new personas are seed rows — the permission engine, RLS, and invite flow all pick them up without code. **Agencies:** client-specific org charts (viewer, agent, manager) are declared per app, while platform roles stay protected.

## In one sentence

`roles` gives every permission check a shared, extensible vocabulary.

---

*Agent-facing chain now lives in `.framework/src/instructions/roles.md` — `## Problem it solves`.*
