---
title: "Why `people` exists"
kind: narrative
verified_against: 24eb144
verified_on: 2026-11-20
extends: .framework/src/instructions/people.md
source_files:
  - .framework/migrations/001_core_schema.sql
  - docs/agents/debugging-notes.md
---

# Why `people` exists

Supabase Auth can tell you who signed in. It can't tell you who that person is *to an account* — their role, their app memberships, their display identity. `people` is the row every security decision flows through.

## The five whys

1. **Why not just auth users?** Auth proves *who* signed in; the platform needs *who they are to each account* — role, app membership, display identity.
2. **Why `auth_uid` + `account_id` + `role_id` on one row?** Every request resolves a principal: person → role → account → accessible accounts. That join must be one table or authentication is a multi-hop lookup per request.
3. **Why `email` unique + `auth_uid` nullable?** Identity precedes authentication — an invite creates the person row before auth exists (pending invites are literally `people` rows carrying `data.invite_token`).
4. **Why typed people (`type_id`)?** Person records are domain-shaped — customer vs staff vs agent personas get different fields via the same types-as-data pattern.
5. **Root:** the principal is the unit every security decision flows through — `people` fuses auth identity, account membership, and role into the row `current_actor_id` and every RLS policy resolve first.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (line ~26):

```sql
auth_uid uuid UNIQUE,       -- NULL until first login
email text UNIQUE NOT NULL,
full_name text NOT NULL,
account_id uuid NOT NULL,
role_id uuid, type_id uuid NOT NULL, ...
```

`_shared/principal.ts` resolves `people + role` on every request (careful: the join returns role as object-or-array — see `docs/agents/debugging-notes.md`); `current_actor_id` in `002` is the DB-side equivalent used inside RLS policies.

## How you'd use it

```tsx
const res = await apiFetch('/api/admin-data?action=list&entity=people&account_id=' + id)
```

Or create via the invite flow — `invites.ts` handles token generation, role binding, rate caps, and placement.

## Who it's for

**Developers:** identity, membership, and role are one join — build features on `ctx.principal`, not auth plumbing. **Agencies:** a person exists before they sign up — invites, role assignment, and scoping all work on the pending row.

## In one sentence

`people` is where authentication becomes authorization.

---

*Agent-facing chain now lives in `.framework/src/instructions/people.md` — `## Problem it solves`.*
