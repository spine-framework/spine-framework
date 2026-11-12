---
id: spine-framework:0005-apps-config-analytics-exposure
title: Only apps.config.analytics is exposed to clients — the rest of apps.config is server-only
status: accepted
kind: invariant
owner: package
since: 0.5.4
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/functions/_shared/permissions.ts
  - .framework/src/lib/analytics.ts
enforced_by:
  - .framework/tests/unit/analytics.test.ts
evidence:
  - { kind: doc, ref: .framework/src/lib/analytics.ts, label: source }
provenance: reconstructed
---

## Context

`apps.config` carries per-app manifest-seeded configuration — registration
behaviour, analytics, integration settings. Some of it (e.g. GA4 measurement
ids per host) legitimately belongs on the client; most does not.

## Decision

The apps projection that reaches clients exposes only the
`config.analytics` subtree: `config: record.config?.analytics ?
{ analytics: record.config.analytics } : undefined` in
`.framework/functions/_shared/permissions.ts`. No other `apps.config` key
may reach the browser.

## Alternatives rejected

- Exposing all of `apps.config` and trusting apps to keep it clean — any
  future key (tokens, routing secrets, admin flags) leaks by default.
- Moving analytics to `system_settings` — it is per-app, manifest-seeded
  config and belongs with the app.

## Consequences

- Adding a client-visible config value means extending the explicit
  projection in `permissions.ts`, never widening it to the whole object.
- Hosts not listed in the `ga4` map are not tracked — previews, localhost,
  and unlisted domains stay dark by default.
