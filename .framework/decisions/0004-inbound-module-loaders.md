---
id: spine-framework:0004-inbound-module-loaders
title: Inbound webhook handlers resolve through the static INBOUND_MODULE_LOADERS map
status: accepted
kind: decision
owner: package
since: 0.5.4
until: null
supersedes: spine-framework:0003-webhook-dynamic-import
superseded_by: null
links: []
applies_to:
  - .framework/functions/_shared/webhook-registry.ts#INBOUND_MODULE_LOADERS
  - scripts/assemble-functions.sh
enforced_by:
  - scripts/verify-exports.ts
evidence:
  - { kind: commit, ref: 81f7461 }
  - { kind: test, ref: scripts/verify-exports.ts, label: source }
provenance: reconstructed
---

## Context

Supersedes `spine-framework:0003-webhook-dynamic-import`. Dynamic
`import(function_name)` broke static bundling and let data select code.

## Decision

Inbound webhook handlers are resolved through the static
`INBOUND_MODULE_LOADERS` map in
`.framework/functions/_shared/webhook-registry.ts`. Adding a handler means
registering a loader entry — never inserting a `webhook_handlers` row with
a `function_name` to be imported at runtime.

## Alternatives rejected

- Keeping `import(function_name)` with bundler hints — still can't produce a
  sound per-app bundle, and the data→code surface stays open.

## Consequences

- esbuild resolves the whole handler graph at bundle time;
  `scripts/verify-exports.ts` catches unresolved imports for every
  standalone profile in `npm run gate`.
- `webhook_handlers` rows may still name a registered loader, but they can
  no longer name arbitrary modules.

Unverified: `since: 0.5.4` is estimated from HEAD's package version; no v0.5.x
git tags exist to confirm it against a released tarball.
