---
title: "Why `rate_limits` exists"
kind: narrative
verified_against: b8e9495
verified_on: 2026-11-13
extends: .framework/src/instructions/security.md
source_files:
  - .framework/migrations/035_rate_limits.sql
---

# Why `rate_limits` exists

Serverless functions share no memory — so a rate limit can't be a counter in a process. It has to be state every invocation can see, and it has to be atomic or concurrent callers double-spend the window. `rate_limits` is that shared ledger; the *policies* live elsewhere.

## The five whys

1. **Why a table instead of in-memory limits?** Serverless instances share nothing — the counter must be durable state.
2. **Why `(key, window_start)` composite PK + atomic upsert?** Concurrent invocations must not double-spend a window — `rate_limit_hit` does `INSERT ON CONFLICT ... count + 1` in one statement. Same lesson as the lease tables: atomic claims, not read-then-write.
3. **Why counters only — no policy columns?** Policies are governance, not mechanism: `resolveRateLimitPolicies` reads `accounts.data.rate_limits` and `apps.config.rate_limits`. The ledger stays policy-agnostic.
4. **Why RLS with no policies?** Tenants must never read others' counters — all access flows through the SECURITY DEFINER RPC or service role. Deny-by-default at the schema level.
5. **Root:** rate limiting is a shared-resource problem — `rate_limits` makes spend atomic, tenant-isolated, and policy-agnostic so any endpoint can opt into throttling without owning the mechanism.

## What it actually is

Defined in `.framework/migrations/035_rate_limits.sql` — `(key, window_start, count)` plus the `rate_limit_hit` RPC. `checkRateLimit(ctx, action)` in `_shared/rate-limit.ts` resolves the policy then spends a unit; `RateLimitError` on exhaustion.

Callers: `ai-agents.ts` (`agent_step` — bounds agent loops), `invites.ts` (`invite_create` — caps invitation abuse), `_shared/security.ts`.

## How you'd use it

```ts
await checkRateLimit(ctx, 'my_action')  // throws when the window is spent
```

Policy config goes in account data or app config: `rate_limits.my_action = { limit, window_seconds }`.

## Who it's for

**Developers:** throttling is one function call — the counter, windowing, and tenant isolation are the platform's. **Agencies:** per-account and per-app limits are config, so a heavy client can be throttled without touching code.

## In one sentence

`rate_limits` is the shared counter that makes throttling atomic across serverless instances.

---

*Agent-facing chain now lives in `.framework/src/instructions/security.md` — `## Problem it solves`.*
