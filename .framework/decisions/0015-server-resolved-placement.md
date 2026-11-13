---
id: spine-framework:0015-server-resolved-placement
title: Registration/invitation placement is server-resolved only — the client supplies app, path, and invite intent
status: accepted
kind: invariant
owner: package
since: 0.5.0
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/functions/invites.ts
  - .framework/functions/_shared/principal.ts
  - .framework/src/lib/registration.ts
  - .framework/src/pages/auth/RegisterPage.tsx
  - .framework/migrations/052_registration_security.sql
enforced_by: []
evidence:
  - { kind: source, ref: "complete-registration rejects anonymous; email/role/account resolved from ctx.principal + installed app config; migration 052 RPC is the only placement writer", label: source }
  - { kind: source, ref: "invites.ts: every member mutation requires requireAccountAdmin of the TARGET person's account (or system_admin); base_url passes an origin allowlist", label: source }
provenance: reconstructed
---

## Invariant

The client sends only `app`, `path`, and invite intent (`invite_token` in
signUp metadata / `{invite:true}` pending intent). **Email, role, account,
and join target are resolved server-side** — the migration-052 RPC is the
only placement writer, so client-supplied `role_slug`/`target_account_id`/
`email` are never trusted.

Enforcement points (all verified in source):

- Invite stubs are claimed exclusively by the token-gated path in
  `handle_new_auth_user`; principal.ts never binds a person by email —
  doing so would bypass token/expiry/revocation checks.
- Every invite/member mutation requires `requireAccountAdmin` of the target
  person's account (or system_admin); `role_slug` must be non-system and
  within the app's server-resolved allowlist.
- `base_url` is client-controlled, so it passes an origin allowlist —
  invite links cannot be pointed at phishing origins.

## History (reconstructed)

This was introduced as the "registration/invitation hardening" batch.
Before it: invite mutations required only a non-anonymous principal (any
authenticated user could revoke/approve/block invites in any account);
people rows were bound by client-supplied email (identity spoofing);
`invite_attempts` was a client-influenced write; and reporting success on
zero-row updates masked failed mutations. The hardening replaced all of
that with account-scoped admin checks and server resolution. The
vulnerability claims are reconstructed from code comments — treat as
plausible history, confirmed by the current code's existence, not as a
verified audit.

## Source

Triage of 15 security markers across invites.ts, principal.ts,
registration.ts, RegisterPage.tsx, migration 052. Consolidated; see
`docs/agents/note-triage-review.md` A5.
