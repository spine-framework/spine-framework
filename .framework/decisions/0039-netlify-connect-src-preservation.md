---
id: spine-framework:0039-netlify-connect-src-preservation
title: Upgrades preserve custom connect-src origins in netlify.toml CSP
status: accepted
kind: decision
owner: package
since: 0.10.4
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/cli/lib/project-files.ts#renderNetlifyToml
  - netlify.toml
enforced_by: []
evidence:
  - { kind: report, ref: "downstream builds 2026-11 (art-mojo-3 caveat, factory-1 G-002): the local-stack CSP edit (loopback connect-src origins for browser auth) was silently reverted on every upgrade because renderNetlifyToml replaced the connect-src directive wholesale; only [functions.\"custom_*\"] sections survived re-render", label: observed }
provenance: captured
---

## Context

`netlify.toml` is regenerated on every `init`/`upgrade` from the package
template. Local installs must extend the `connect-src` CSP directive with
loopback origins (`http://127.0.0.1:54321`, `ws://…`) or browser auth
against the local Supabase stack fails with a bare "Failed to fetch".
`renderNetlifyToml` preserved `[functions."custom_*"]` sections verbatim
but replaced the CSP header wholesale, so each upgrade silently reverted
the required edit — the failure surfaced later, in the browser, far from
the upgrade that caused it.

## Decision

`renderNetlifyToml` now **unions** `connect-src` origins: origins present
in the existing file but not shipped by the package are re-appended to
the rendered directive (after `upgrade-insecure-requests`-style
non-origin tokens are excluded). Origins the package already ships are
not duplicated; package upgrades to the directive still win for entries
it owns.

## Alternatives rejected

- **Preserve the whole `connect-src` line verbatim**: freezes
  framework-shipped origins — a package fix to the CSP would never reach
  existing projects. Origin-level union keeps ownership split correctly.
- **Document "re-apply after upgrade" forever** (the prior guide
  stance): a standing caveat for a mechanical revert is a workaround for
  a bug, not a contract; it also violates the upgrade promise that
  customer edits outside framework-owned blocks survive.
- **Move local-loopback origins into the shipped template**: dev-only
  origins in the production CSP widens the attack surface for hosted
  deploys; the local-stack edit must stay a local edit.

## Consequences

- The local-stack CSP edit is durable across upgrades; the guide no
  longer needs a re-apply caveat.
- Union is additive only — an origin removed upstream is removed on
  upgrade (package-owned entries follow the new template).
- `netlify.toml` remains un-manifested (`verify` doesn't hash it); the
  merge is structural, not checksum-driven.
