---
title: "Why `security_blocklist` exists"
kind: narrative
verified_against: b8e9495
verified_on: 2026-11-13
extends: .framework/src/instructions/security.md
source_files:
  - .framework/migrations/049_security_blocklist.sql
---

# Why `security_blocklist` exists

When you discover abuse — a spam domain registering accounts, a scanner hitting your endpoints — the response can't be "edit middleware and redeploy." `security_blocklist` makes the denial runtime-editable data, checked at the system's entry points.

## The five whys

1. **Why a table instead of middleware lists?** Blocks are discovered at runtime and must apply across functions — data, not constants.
2. **Why `type` + `value`?** The denylist is polymorphic — an IP, an email, a domain, a person, an account are different lookups; typed values make checks dispatchable.
3. **Why `severity` + `expires_at`/`revoked_at`?** Blocking isn't binary — soft flag vs hard ban, temporary vs permanent, revocable vs committed. The row carries the full decision lifecycle. (Current checks enforce `hard` only; `soft` is reserved flagging.)
4. **Why check at chokepoints?** Expensive checks belong where abuse enters — `checkRegistrationBlocklist` screens email/domain/IP *before* placement work; `checkIpBlocklist` covers the authenticated-request path with a decision cache.
5. **Root:** abuse defense must be runtime-editable data at entry points — `security_blocklist` gives operators a typed, severitied, expirable denylist without a deploy.

## What it actually is

Defined in `.framework/migrations/049_security_blocklist.sql`:

```sql
type CHECK (ip|email|email_domain|person_id|account_id),
value, severity CHECK (soft|hard), reason, banned_by,
expires_at, revoked_at, UNIQUE (type, value)
```

`_shared/security.ts`: `lookupBlocklist` (cached, filters expired/revoked), `checkRegistrationBlocklist` (email+domain+IP → 403 + `security.registration_blocked` audit event), `checkIpBlocklist`.

## Who it's for

**Developers:** abuse rules are rows — add one and it's enforced at the chokepoints, cached for hot paths. **Agencies:** a bad actor targeting one client gets blocked at the platform edge — per-email, per-domain, or per-IP — without a code change or a deploy.

## In one sentence

`security_blocklist` turns "block them" into an instant, typed, reversible decision.

---

*Agent-facing chain now lives in `.framework/src/instructions/security.md` — `## Problem it solves`.*
