---
title: "Why `accounts` exists"
kind: narrative
verified_against: 677f018
verified_on: 2026-11-13
extends: .framework/src/instructions/accounts.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `accounts` exists

Every record in a multi-tenant system must answer one question: *whose data is this?* `accounts` is the boundary — and `account_paths` is what makes that boundary traversable at the speed RLS policies need.

## The five whys

1. **Why a tenant table at all?** Multi-tenancy needs a unit of isolation — every record, role, and policy must answer "whose data is this?"
2. **Why hierarchical (`parent_id`)?** Real tenancy isn't flat — orgs contain sub-orgs, agencies manage client accounts; support sees down the tree without seeing sideways.
3. **Why a closure table (`account_paths`)?** Hierarchy lookups run inside RLS policies on *every* governed read. They must be a fast join of precomputed ancestor/descendant pairs, not a recursive CTE per row. `get_accessible_accounts` resolves the whole accessible set in one service-role RPC.
4. **Why typed accounts (`type_id`)?** Accounts are domain-shaped too — a "client org" and a "sandbox" carry different fields. Same types-as-data pattern as items.
5. **Root:** tenancy is the foundation's non-negotiable — `accounts` defines the boundary, `account_paths` makes it traversable at policy speed, and every other primitive's `account_id` borrows this isolation.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (line ~15); closure table at line ~326; `get_accessible_accounts` in `002_core_rls_and_functions.sql`.

```sql
accounts: id, parent_id, type_id, slug UNIQUE, display_name,
          data jsonb, logs_retention_days, observability_retention_days
account_paths: ancestor_id, descendant_id, depth, PK(ancestor, descendant)
```

`ENTITY_ACCOUNT_KEY` in `_shared/account-scope.ts` maps every governed entity to its account column; `ifAccountScope` filters queries by the accessible set; RLS policies use the same helpers as the last line of defense.

## Companion: `account_paths`

A derived table — maintained by triggers (`update_account_paths`), never written by apps. It exists purely so "which accounts can this actor reach?" is a join instead of recursion. Covered here because its why is entirely inherited from `accounts`' hierarchy.

## Who it's for

**Developers:** scoping is automatic — write `account_id` and the framework does isolation. **Agencies:** the agency-managing-clients shape is native — parent account sees child accounts' data, children never see each other.

## In one sentence

`accounts` is the tenant boundary; `account_paths` is how fast the boundary can be walked.

---

*Agent-facing chain now lives in `.framework/src/instructions/accounts.md` — `## Problem it solves`.*
