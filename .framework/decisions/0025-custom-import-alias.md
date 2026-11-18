---
id: spine-framework:0025-custom-import-alias
title: "@custom/* import alias — canonical resolution target"
status: accepted
kind: decision
owner: package
since: 0.7.0
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - config/tsconfig.json
  - config/vite.config.ts
  - .framework/src/instructions/reference/frontend-sdk.md
enforced_by:
  - .framework/tests/unit/import-alias-parity.test.ts
evidence:
  - { kind: doc, ref: "config/tsconfig.json:25 mapped @custom/* -> ../custom/* while config/vite.config.ts:85 maps @custom -> ../custom/apps — no specifier satisfied both", label: observed }
  - { kind: doc, ref: "instructions split along the two mappings: concepts/core-vs-custom.md (tsconfig) vs guide/02-project-map.md + reference/frontend-sdk.md (vite)", label: observed }
  - { kind: test, ref: "custom/tests/answer-once-ui.test.ts asserts app code may not use @custom/ specifiers at all", label: observed }
provenance: captured
---

## Context

`@custom/*` resolved differently under the two configs that matter:

- `config/tsconfig.json` — `"@custom/*": ["../custom/*"]` (typecheck)
- `config/vite.config.ts` — `'@custom': path.resolve(__dirname, '../custom/apps')` (bundle)

An import like `@custom/foo/x` typechecked under one mapping and bundled
under the other — never both. Docs inherited the split: `core-vs-custom`
described the tsconfig mapping, `project-map`/`frontend-sdk` described the
vite one. The mismatch was latent only because
`custom/tests/answer-once-ui.test.ts` forbids `@custom/` specifiers inside
app code — nothing exercised it.

## Decision

Canonical target is **`custom/apps/*`** (adjudicated 2026-11-17, option A):
`@custom/<slug>/...` means "cross-app import." `config/tsconfig.json` now
maps `"@custom/*": ["../custom/apps/*"]` to match vite, and
`core-vs-custom.md` is updated. An alias-parity unit test keeps the two
configs from diverging again.

## Alternatives rejected

- **Canonical `custom/*`** — fix vite + two docs to match tsconfig, keeping
  `@custom/components/…` / `custom/functions` helper imports possible.
  Rejected: nothing uses them, and it widens the alias outside the
  mounted-app model (only `custom/apps/<slug>` is assembled into
  `.assembled/src`).
- Leaving both as-is: real config bug — the first legitimate `@custom/`
  import would either fail typecheck or fail the bundle.

## Consequences

- Any code written against the old tsconfig mapping (`@custom/<dir>`
  meaning `custom/<dir>`) stops typechecking — none known; the alias is
  barely used.
- `frontend-sdk.md`'s "Cross-app imports" semantics are now the single
  contract on both sides of the build.
