---
id: spine-framework:0006-update-app-baseline-from-lockfile
title: update-app proves its baseline from package-lock.json + tarball integrity, never node_modules
status: accepted
kind: decision
owner: package
since: 0.5.5
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/cli/lib/update-app-guard.ts
  - .framework/cli/commands/install-app.ts
enforced_by:
  - .framework/tests/unit/update-app-guard.test.ts
evidence:
  - { kind: test, ref: .framework/tests/unit/update-app-guard.test.ts, label: source }
provenance: captured
---

## Context

`update-app` used to `npm install <pkg>@latest` and then copy
`APP_COPY_ENTRIES` over `custom/apps/<slug>/`, silently destroying any local
modifications. To warn first, it needs to know what the *installed* version
looked like — and `node_modules` can't prove that (contents may already be
edited or mid-upgrade).

## Decision

The baseline is the **exact installed version plus sha512 integrity** read
from `package-lock.json` (`packages["node_modules/<pkg>"]`). The tarball for
that exact spec is `npm pack`ed into `.spine/cache/pkgs/`, its hash compared
to the lockfile `integrity`, then extracted and diffed against the local
tree. If any link in that chain is missing, the run aborts
`baseline unverifiable: <reason>` rather than guessing. `--force` overrides
but still writes `.spine/backups/<slug>-<ver>-<ts>.tar.gz` first — and every
proceeding run backs up.

## Alternatives rejected

- Diff against `node_modules` — can't distinguish "pristine" from
  "already modified"; provenance would be assumed, not verified.
- Use the caret range in `package.json` — resolves to a *different* version
  than what is installed.
- Skip verification when the network is down — silently unprotected
  overwrite is exactly the failure mode this guard exists to prevent.

## Consequences

- Local-package (`file:`) installs verify via the lockfile `resolved` path;
  entries without `integrity` are unverifiable and require `--force`.
- `.spine/cache/` and `.spine/backups/` are runtime state — gitignored.
