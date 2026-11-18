---
title: "Why `api_keys` exists"
kind: narrative
verified_against: dfb657b
verified_on: 2026-11-13
extends: .framework/src/instructions/api-keys.md
asserted_by:
  - "Spine docs author — narrative rationale; confirmed stamps preserved in body"
---

# Why `api_keys` exists

People authenticate with Supabase Auth. Machines — background jobs, external services, CLIs — aren't people. They need scoped, revocable credentials that don't die with a session, and their activity needs the same auditability a person's gets.

## The five whys

1. **Why separate credentials instead of user tokens?** Machine actors aren't people — sessions expire, people leave; a service credential must be scoped to the job and revocable on its own.
2. **Why `key_hash` instead of stored keys?** A leaked database must not leak usable credentials — the row stores a salted slow-hash verifier (added in `004`), never the secret.
3. **Why the config-table shape?** Keys carry scope/limit config and app/account scoping — `principal.ts` resolves them into machine principals like any other governed identity.
4. **Why a separate `api_key_usage_logs`?** Machine traffic differs from human logs — method/path/IP/status/duration per call for billing, abuse detection, forensics, without polluting `logs`.
5. **Root:** non-human actors are principals too — `api_keys` gives machines scoped, revocable identity, and `api_key_usage_logs` makes their activity as auditable as a person's.

## What it actually is

`api_keys` in `001` (config-table shape); `key_hash` added in `004` with a partial unique index. `principal.ts` (~line 175) looks up the key, `verifyApiKey` checks the hash, and the request proceeds under a machine principal — which is what `actions.default_machine_principal_id` and `schedules.machine_principal_id` bind to.

`api_key_usage_logs` (004) records `request_method`, `request_path`, `request_ip`, `response_status`, `duration_ms`, `success` per call.

## Companion: `api_key_usage_logs`

The traffic ledger — exists because machine activity must be attributable (which key, which endpoint, what happened) without polluting human-facing `logs`.

## Who it's for

**Developers:** "give this service an API key" is a row with scopes — auth, attribution, and usage audit are automatic. **Agencies:** client integrations authenticate with revocable, scoped keys — a compromised key is a row update, not a breach of a user identity.

## In one sentence

`api_keys` gives machines the same governed identity people get.

---

*Agent-facing chain now lives in `.framework/src/instructions/api-keys.md` — `## Problem it solves`.*
