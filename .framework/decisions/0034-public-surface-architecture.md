---
id: spine-framework:0034-public-surface-architecture
title: Anonymous visitors render public-marked custom apps inside the SPA — `is_public` becomes a real mount flag; static public/ + createPublicHandler remains the simple-sites pattern
status: accepted
kind: decision
owner: package
since: 0.10.2
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/src/App.tsx
  - .framework/src/components/CustomAppLoader.tsx
  - .framework/src/instructions/tasks/serve-public-content.md
  - .framework/src/instructions/concepts/apps-and-renderers.md
enforced_by:
  - .framework/tests/unit/public-app-mount.test.ts
evidence:
  - { kind: report, ref: "downstream project build review 2026-11-25: a public marketplace needed unauthenticated pages with path params, per-page meta, and app components — static public/ files could not provide them; the project shipped parallel static pages + member pages", label: observed }
  - { kind: source, ref: "manifest/docs already described is_public/auth_required as unwired — the flags existed as dead config", label: source }
provenance: captured
---

## Context

"Apps are always behind login" is a real, documented constraint: the SPA
router serves only `/login`, `/register`, `/forgot-password` to anonymous
visitors. The sanctioned pattern (static `public/` files +
`createPublicHandler` reads) covers marketing pages and simple feeds but
cannot produce parameter routes (`/campaign/<slug>`), per-page SEO meta,
or shared components — a real product surface forced a downstream project
to build parallel static and member versions of the same pages.

Meanwhile `apps.is_public`/`auth_required` existed on the manifest as
documented-but-unwired config.

## Decision

Wire `is_public` end-to-end: a custom app mounted with `is_public: true`
renders inside the SPA for anonymous principals — its routes, components,
path params, and document head work like a member app's. Anonymous data
still comes only through `createPublicHandler` functions (the principal
resolves anonymous and the handler must project public-safe fields —
unchanged contract; `is_public` governs *rendering*, never *access*).

Static `public/` + `createPublicHandler` stays the documented pattern for
simple public pages — one mechanism for app-scale surfaces, one for
documents.

## Alternatives rejected

- **Keep static-only**: the pattern demonstrably cannot serve a real
  marketplace/blog/catalog surface; every such project duplicates pages.
- **Prerender/SSR**: out of scope for the SPA deployment model; public
  apps get SEO the way the SPA does, plus `<title>`/meta via the app.

## Consequences

- `serve-public-content.md` is rewritten: simple pages stay static;
  app-scale public surfaces mount `is_public` apps.
- Routers must not treat an anonymous principal on a public app as an
  auth failure — the app's own components decide what to render for
  anonymous (sign-in prompts inside pages, not a redirect wall).
