---
id: spine-framework:0003-webhook-dynamic-import
title: Webhook handlers resolved via dynamic import(function_name) — SUPERSEDED
status: superseded
kind: rejected-alternative
owner: package
since: 0.4.0
until: 0.5.4
supersedes: null
superseded_by: spine-framework:0004-inbound-module-loaders
links:
  - spine-framework:0004-inbound-module-loaders
applies_to:
  - .framework/functions/_shared/webhook-registry.ts
enforced_by: []
evidence:
  - { kind: commit, ref: 81f7461 }
provenance: reconstructed
---

## Context

Inbound webhook handlers were dispatched by `import(function_name)` where
`function_name` came from `webhook_handlers` rows. A data row selected the
code path.

## Decision (superseded)

Registering a handler meant inserting a `webhook_handlers` row whose
`function_name` the loader would import dynamically.

## Why it was superseded

Dynamic `import(<runtime string>)` is invisible to bundlers: esbuild can't
resolve the specifier, per-app exports bundled the wrong graph, and a typo'd
`function_name` failed only at request time. It also widened the
data-chooses-code surface.

## Consequences

Replaced by static `INBOUND_MODULE_LOADERS` in
`.framework/functions/_shared/webhook-registry.ts` (see
`spine-framework:0004-inbound-module-loaders`). Historical migrations that
insert `webhook_handlers` rows with `function_name` remain; new handlers
register statically.

Unverified: the `since` version is estimated; confirm against the first
release that shipped the dynamic loader.
