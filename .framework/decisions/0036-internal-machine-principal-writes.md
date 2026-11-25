---
id: spine-framework:0036-internal-machine-principal-writes
title: Internal machine principals are system principals for record writes, not just record access
status: accepted
kind: decision
owner: package
since: 0.10.3
until: null
supersedes: null
superseded_by: null
links: [spine-framework:0032-system-column-write-model]
applies_to:
  - .framework/functions/admin-data.ts
  - .framework/functions/_shared/principal.ts
  - .framework/functions/_shared/permissions.ts
enforced_by:
  - .framework/tests/unit/admin-data-system-columns.test.ts
evidence:
  - { kind: report, ref: "downstream build 2026-11-25 (art-mojo-3 G-002): a custom_<slug> cron handler invoked over x-internal-secret received an unbound internal machine principal; admin-data writes returned a misleading 'Authentication required' 403 because write validation bypassed only for role-based isSystemAdmin, not isSystemPrincipal", label: observed }
provenance: captured
---

## Context

Decision `0032` made system columns writable only by *system principals* —
and `isSystemPrincipal(ctx)` already defined that as `system_admin` roles
**or** an unbound internal machine principal (`isInternal && !accountId`).
But the outer validation bypasses in `admin-data` used the narrower
role-based `isSystemAdmin`, so a `handler_module: 'custom'` handler running
under the internal-invoke channel passed every access check yet failed
write validation — surfaced to the app as a misleading `Authentication
required`. The field-level guard already agreed with this decision:
`canWriteSystemColumn` returns true for `principal.isInternal`.

## Decision

The write-validation bypasses (`!validation.valid` on update/atomic/delta
and `!perms.canDelete`) accept `isSystemPrincipal(ctx)`, matching the
create path's `isMachineGlobal` escape and the access checks. Internal
machine principals — the `x-internal-secret` channel and unbound
`is_internal` machine keys — are system for *all* record writes, not only
reads. Account-bound machine keys are still scoped; `isSystemPrincipal`
requires `!accountId`.

## Alternatives rejected

- **Stamp `roles: ['system_admin']` on the machine principal** (the
  downstream workaround): duplicates a role check onto a principal the
  framework itself minted and trusted; the role grant is implied by the
  channel, not data.
- **A `systemCtx()` helper apps call explicitly**: adds a second way to
  say the same thing; the channel already proves system-ness.

## Consequences

- Custom cron handlers and other internal invocations can write records
  (including `status`/`is_active` transitions) without stamping roles.
- The trust boundary is unchanged: `x-internal-secret` (or an `is_internal`
  machine key with `*:*` scope and no account binding) is already required
  to mint the principal — widening what that principal may do changes no
  attacker-visible surface.
- Field-level `permissions`/`system_fields` still govern human-role
  writes; this only aligns machine principals with the 0032 definition.
