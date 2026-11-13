---
id: spine-framework:0010-esbuild-optional-import-in-try
title: esbuild and zip-it-and-ship-it treat import() inside try/catch as optional
status: accepted
kind: lesson
owner: package
since: 0.5.5
until: null
supersedes: null
superseded_by: null
links:
  - spine-framework:0002-assembler-import-stubs
  - spine-framework:0009-loader-try-catch
applies_to:
  - scripts/assemble-functions.sh
  - .framework/functions/_shared/webhook-registry.ts
enforced_by:
  - scripts/verify-exports.ts
evidence:
  - { kind: test, ref: 'local zip-it-and-ship-it 16.3.0 fixture: try/catch import() bundles clean, bare import() of a missing module fails "Could not resolve"', label: fixture }
  - { kind: decision, ref: spine-framework:0009-loader-try-catch, label: 'recorded the claim; refactor proposal rejected on adjudication' }
provenance: captured
---

## Context

During the E2 D3 pilot an agent proposed removing the assembler's
stub-generation step (record 0002) on the grounds that bundlers cannot be
stopped by try/catch — that premise was itself unverified.

## Verified fact

esbuild — including the copy inside Netlify's zip-it-and-ship-it —
deliberately does not resolve an `import()` specifier inside a `try` body
(the try is assumed to handle a runtime failure). Verified against
zip-it-and-ship-it 16.3.0 with `node_bundler = "esbuild"`:

- `try { await import('./missing') } catch {}` → bundles clean
- `await import('./missing')` → `Could not resolve`, build fails

## Consequences

- The try/catch loader pattern is a *valid* alternative design, not a wrong
  one — if a future loader needs invocation-time optionality it is available
  and bundler-safe.
- The assembler stub step (0002) was nevertheless retained: it fails at
  build time rather than invocation time and costs little. See 0009's
  adjudication note.
- Caveat: verified on local ZISI 16.3.0; Netlify pins its own bundler
  version, so this fact should be re-verified if the bundler is upgraded.
