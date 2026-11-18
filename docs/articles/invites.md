---
title: "Why invites work the way they do"
kind: narrative
verified_against: d41b1d8
verified_on: 2026-11-13
extends: .framework/src/instructions/invites.md
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Why invites work the way they do

An invite is a person who hasn't authenticated yet. Spine Framework models that literally: a pending invite *is* a `people` row — created before sign-up, carrying `data.invite_token`, bound to an account and role at creation. There's a catch worth knowing up front: the `invites` *table* existed in the schema with zero readers or writers — the mechanism lives on `people`. The dead table was dropped by migration 080 (decision `spine-framework:0016`).

## The five whys

1. **Why does an invite need a pre-auth identity?** The account, role, and email must be bound *before* the person authenticates — otherwise acceptance becomes a placement problem.
2. **Why reuse `people` for pending invites?** Acceptance becomes a status transition, not a row migration — the person record, its `account_id`, and `role_id` are already correct; only `auth_uid` is missing.
3. **Why `data.invite_token` on the row?** The secret lives on the row it activates, looked up via `data->>invite_token` — no separate token table to keep in sync with people.
4. **Why a service-role-only placement RPC?** Migration `052`'s hardening: client-supplied email, `role_slug`, and `target_account_id` previously steered placement — an identity-spoofing vector. `complete_registration_placement` resolves placement server-side and closes it.
5. **Root:** an invite is a person who hasn't authenticated yet — modeling it as a `people` row keeps the identity lifecycle single-table and makes "who can join, as what role" governed data rather than an auth-side channel.

## What it actually is

- **`invites.ts`** `createInvite`: requires `*_admin` role, enforces per-account rate caps (`rate_limits`) and registration blocklist screening (`security_blocklist`, migration 049), generates a token, inserts the pending `people` row.
- **Acceptance** resolves `people.data->>invite_token` → `complete_registration_placement` RPC (052) → `auth_uid` bound on first login.
- **`public.invites`** (001 ~line 285, dropped by 080): generic config-table shape, RLS enabled, **unused by any code** — declared-but-vestigial, removed once the audit proved nothing touched it.

## How you'd use it

```tsx
await apiFetch('/api/invites', {
  method: 'POST',
  body: JSON.stringify({
    email: 'ana@client.com', account_id: accountId,
    role_slug: 'member', full_name: 'Ana'
  })
})
```

## Who it's for

**Developers:** inviting = one endpoint; the lifecycle (token, expiry via `INVITE_EXPIRY_DAYS`, placement) is handled. **Agencies:** onboarding a client's team is role-bound invites — admins create them, placement can't be spoofed, and rate caps prevent abuse.

## In one sentence

An invite is a person row waiting for its `auth_uid`.

---

*Agent-facing chain now lives in `.framework/src/instructions/invites.md` — `## Problem it solves`.*
