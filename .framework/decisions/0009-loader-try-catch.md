---
id: spine-framework:0009-loader-try-catch
title: Loader import()s are wrapped in try/catch so absent app modules never reach the bundler
status: rejected
kind: decision
owner: package
since: 0.5.4
until: null
supersedes: null
superseded_by: null
links:
  - spine-framework:0002-assembler-import-stubs
  - spine-framework:0004-inbound-module-loaders
applies_to:
  - .framework/functions/_shared/webhook-registry.ts
  - scripts/assemble-functions.sh
enforced_by:
  - scripts/verify-exports.ts
evidence:
  - { kind: test, ref: scripts/verify-exports.ts, label: source }
provenance: captured
---

## Context

`spine-framework:0002-assembler-import-stubs` made `assemble-functions.sh`
emit throw-on-invoke stubs for `import('../…')` targets absent from a
standalone export's function set, on the premise that bundlers resolve the
specifier statically regardless of surrounding code. That premise is wrong:
esbuild deliberately skips bundling an `import()` inside a `try` body (the
try is assumed to handle a runtime failure), so the specifier never has to
resolve at bundle time. The assembler stub step was extra machinery solving
a problem a five-line change in the loader solves directly.

## Decision

Each entry of `INBOUND_MODULE_LOADERS` in
`.framework/functions/_shared/webhook-registry.ts` wraps its `import()` in
`try { return await import(...) } catch { return null }`. The stub-generation
step is removed from `scripts/assemble-functions.sh`. A module absent from
the deployment resolves to `null` at runtime, and `loadHandler` logs
"not installed in this deployment" — the failure is still loud, just moved
from bundle time to invocation time, which is where it belongs: a handler
module can only be invoked when a `webhook_handlers` row names it, and such
a row for an uninstalled app is itself a misconfiguration.

## Alternatives rejected

- Keeping the assembler stubs — an extra generation step whose output must
  be re-synced on every import-map change, to emulate behavior esbuild
  already provides for free.
- Rejected-alternative note from 0002 ("a swallowed error hides real
  misconfiguration") — the catch does not swallow silently: `loadHandler`
  logs and returns null, and `resolveHandler` propagates the failure.

## Consequences

- The assembler no longer scans staged files for `import('../…')`
  specifiers; new loader-map entries just need the same try/catch shape.
- `import()` expressions elsewhere (e.g. `_shared` lazy imports of
  framework top-level functions) keep bundling normally — their targets
  always ship with `.framework/functions` in every export profile.
- `scripts/verify-exports.ts` still bundles every standalone profile's
  functions in `npm run gate`; genuine unresolved static imports still
  fail the gate.

## Pending review

Agent-proposed during the E2 D3 pilot run (evidence: esbuild 0.25.12 treats
try-wrapped `import()` as an optional dependency — verified independently in
two runs). Proposes to supersede `spine-framework:0002-assembler-import-stubs`;
the `supersedes`/`superseded_by` link is intentionally unset until human
acceptance. Netlify's production bundler (zip-it-and-ship-it) must be verified
to honor the same semantics before adoption.

## Adjudication (2026-11-12, human-reviewed)

**Factual claim: verified** against the actual production bundler —
zip-it-and-ship-it 16.3.0 with `node_bundler = "esbuild"` bundles
`try { await import('./missing') } catch {}` cleanly and fails
`await import('./missing')` with `Could not resolve`. (evidence: fixture —
local ZISI; Netlify-pinned version may differ.)

**Proposal: rejected.** A working alternative is not a demonstrated
advantage. The assembler stubs also fail *at build time* ("Stubbed missing
import target" is printed during assembly), while the try/catch design moves
the same failure to invocation time — no measurable gain for removing
working machinery, and the stub path keeps `verify-exports` meaningful.
The verified fact is preserved in
`spine-framework:0010-esbuild-optional-import-in-try`.

0002's decision (stubs) therefore remains `accepted`; only its rationale was
invalidated.
