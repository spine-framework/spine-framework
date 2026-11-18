---
title: "Why `apps` exists"
kind: narrative
verified_against: 6ab1f37
verified_on: 2026-11-13
extends: .framework/src/instructions/apps.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `apps` exists

A multi-tenant platform hosts many applications. Each one needs routing, navigation, role gating, dependencies, and install-time state — and none of that can live in the core, or the core stops being upgrade-safe. `apps` is the registry that gives every application a runtime identity.

## The five whys

1. **Why not hardcode each app into the core?** Core would then depend on custom code — violating the boundary that makes upgrades safe.
2. **Why can't apps just be folders of files?** A folder has no runtime identity: nothing to check roles against, no route prefix to mount, no dependency list to validate, no seed to replay.
3. **Why both a `manifest.json` and a database row?** The manifest is the install-time declaration; the row is the runtime truth. Install binds the two — the platform then queries the row at boot and per-request (`get_account_apps`, `required_roles` envelopes in `permissions.ts` and `kb.ts`). A file on disk can't participate in RLS, joins, or account-scoped checks.
4. **Why install rather than migrations alone?** Install binds code (manifest) to data (app row + seeded types/roles/pipelines) — the app only exists once both halves are in place.
5. **Root:** apps must be data, not just code, because access control, routing, and lifecycle are platform responsibilities — a platform can't govern what it can't query.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql`; written by `install-app` from `manifest.json` (`apps.ts`).

- `slug`, `name`, `route_prefix`, `renderer` (`custom` | `generic`)
- `required_roles` — OR-list enforced by `get_account_apps` (service-role-only RPC) and the `kb.ts` envelope
- `nav_items`, `dependencies`, `config` — routing, declared primitive deps, app-level settings
- `preview_domain` / `prod_domain(s)` / route prefixes — multi-host support

Frontend: `AuthenticatedRouter.tsx` reads the registry to build the route tree; `CustomAppLoader` vs `GenericAppShell` pick the renderer.

## How you'd use it

```json
// custom/apps/my-app/manifest.json
{ "slug": "my-app", "route_prefix": "/my-app", "renderer": "custom",
  "required_roles": ["member"], "dependencies": ["items", "threads"],
  "seed": [{ "file": "seed/types.json", "table": "types", "conflict": "kind,slug" }] }
```

App code reads its own row via `useCurrentApp()`.

## Who it's for

**Developers:** `renderer: "generic"` gives you list/detail pages from type views alone — an app can ship with zero custom UI. **Agencies:** one codebase, many client apps — each is a manifest + seeds + only the pages that are actually custom.

## In one sentence

`apps` turns "an app" from a pile of code into a row the platform can govern.

---

*Agent-facing chain now lives in `.framework/src/instructions/apps.md` — `## Problem it solves`.*
