---
id: spine-framework:0002-assembler-import-stubs
title: The assembler emits stubs for unbundled dynamic-import targets
status: accepted
rationale_status: invalidated
kind: workaround
owner: package
since: 0.5.4
until: null
supersedes: null
superseded_by: null
links:
  - spine-framework:0004-inbound-module-loaders
  - spine-framework:0009-loader-try-catch
applies_to:
  - scripts/assemble-functions.sh
  - .framework/functions/_shared/webhook-registry.ts
enforced_by:
  - scripts/verify-exports.ts
evidence:
  - { kind: commit, ref: 81f7461 }
  - { kind: test, ref: scripts/verify-exports.ts, label: source }
  - { kind: decision, ref: spine-framework:0010-esbuild-optional-import-in-try, label: 'disproving evidence (verified on zip-it-and-ship-it)' }
provenance: reconstructed
---

## Context

`assemble-functions.sh` copies `functions/<name>.ts` into each app's
assembled functions. Some handlers dispatch to sibling `custom_*` modules by
dynamic import (e.g. `../custom_make-inbound`). Apps that don't ship those
modules produced esbuild failures on export (`Could not resolve`).

## Decision

During assembly, dynamic-import targets that are absent from the app's
function set get a generated stub module that throws at call time. Static
bundles then succeed for every app, and a missing handler fails loudly at
runtime instead of silently shipping.

## Alternatives rejected

- `try/catch` around the dynamic imports — the recorded rationale (bundlers
  still can't resolve the specifier) is **invalidated**: esbuild treats an
  `import()` inside `try` as an optional runtime dependency, so try/catch
  does bundle cleanly. The decision (stubs) still stands — stubs keep a
  missing module loud and explicit, and Netlify-parity for the alternative
  is unverified. See `spine-framework:0009-loader-try-catch` (proposed).
- Shipping every module to every app — defeats per-app packaging.

## Consequences

- Exports must never hand-edit assembled output; edit the source and
  re-assemble.
- `scripts/verify-exports.ts` exports every standalone profile and bundles
  each function, so a regression here fails `npm run gate`.

Unverified: `since: 0.5.4` is estimated from HEAD's package version; no v0.5.x
git tags exist to confirm it against a released tarball.
