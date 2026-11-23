---
id: spine-framework:0030-nav-items-per-renderer
title: nav_items path convention is per-renderer, not universal
status: accepted
kind: decision
owner: package
since: 0.9.0
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/cli/commands/validate-app.ts#validateRoutes
  - .framework/src/components/app-shell/GenericAppShell.tsx
enforced_by:
  - .framework/tests/unit/validate-app.test.ts
evidence:
  - { kind: doc, ref: ".framework/src/instructions/reference/app-manifest.md", label: source }
provenance: captured
---

## Context

`app-manifest.md` told app authors that `nav_items[].path` "must include
the `route_prefix`" while `validate-app` rejected any path that did — a
doc-vs-validator contradiction Jason's Hikes hit choosing a convention.
Both sides were right for different renderers: `GenericAppShell`
navigates an absolute `item.path` verbatim (`navigate(target)`), so a
root-relative path like `/tasks` escapes the app's mount and 404s;
custom renderers resolve their own links and declare root-relative paths
(answer-once, demo). The `Manifest` interface in validate-app didn't even
declare `renderer`, so the check couldn't scope by it.

## Decision

The convention is **per-renderer**, enforced by `validate-app`:

- `renderer: 'generic'` — absolute `nav_items[].path` values must include
  `route_prefix` (verbatim navigation). Relative paths are also valid —
  GenericAppShell prefixes them at navigate time.
- `renderer: 'custom'` (the default) and `'none'` — paths must be
  root-relative and must NOT include `route_prefix`.

Prefix matching is exact-segment (`path === prefix` or
`path.startsWith(prefix + '/')`), so `/test-app` no longer trips the
`/test` rule. Two adjacent validator gaps fixed in the same pass:
`nav_items` was silently skipped whenever `routes` was absent (an early
`return` short-circuited it), and `route_prefix` now warns when its first
segment collides with a resolvable root path (`/app`, `/src`, `/api`,
…) — Vite can serve those before the SPA route on case-insensitive
filesystems.

## Alternatives rejected

- **One universal root-relative convention + GenericAppShell
  prefix-resolution** — simpler conceptually, but it changes runtime
  behavior for a doc bug and silently re-interprets existing generic-renderer
  manifests written to the doc. The validator knowing the renderer is the
  smaller, honest fix; `manifest.renderer` already existed in install-app.
- **Fix the doc only** — leaves generic-renderer authors unguarded against
  the verbatim-navigation 404 that motivated the doc's wording.

## Consequences

- `nav_items` rules are now checkable truth instead of prose — the doc
  table describes the per-renderer split and defers to the validator.
- Manifests omitting `renderer` keep the custom convention (install-app's
  own default), so nothing already shipping changes behavior.
- Apps that want the generic renderer must write prefixed absolute paths
  — the validator error names the corrected value.
