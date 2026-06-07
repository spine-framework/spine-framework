# Spine npm Packages Plan

**Created:** May 28, 2026  
**Version target:** 0.x (breaking change freedom until stable)  
**CLI standard:** All commands via `spine-framework` — no shorthand aliases  
**Status:** Planning  

---

## Goal

Publish Spine Core and its apps as independent npm packages that any developer or agentic IDE can install and run from scratch.

```bash
npm install spine-framework
spine-framework init                              # stand up DB schema + seed
spine-framework install-app spine-framework-cortex
spine-framework install-app spine-framework-portal
npm run assemble && netlify dev
```

---

## Package Model

### Three packages, one dependency direction

```
spine-framework                    ← core platform, no spine dependencies
spine-framework-cortex             → peerDep: spine-framework
spine-framework-portal             → peerDep: spine-framework
```

No cross-dependency between `spine-framework-cortex` and `spine-framework-portal`. Each is wholly self-sufficient.

> **Hard constraint:** `spine-framework` (the admin UI and core runtime) must have **zero knowledge of Cortex or Portal**. No hardcoded app names, slugs, or paths in core code. The one current exception — `discoverManifests()` in `app-manifest.ts` — is a **Phase 4 blocker** and must be resolved before packaging.

### What each package contains

**spine-framework**
- Core DB schema (`000_foundation.sql`) and seed data (`001_seed.sql`)
- Core Netlify functions (auth, items, pipelines, accounts, people, webhooks, etc.)
- Core frontend shell (routing, auth context, AppShell, UI primitives, hooks)
- CLI (`spine-framework init`, `spine-framework create-app`, `spine-framework migrate`, etc.)
- Assembly scripts
- Public API surface (`_shared/index.ts`)

**spine-framework-cortex**
- Frontend: all Cortex pages, components, sidebar
- `manifest.json` — routes, roles, nav
- `seed/types.json` — type definitions Cortex needs upserted on install
- No DB migrations, no owned tables

**spine-framework-portal**
- Frontend: all Portal pages, components, sidebar
- `manifest.json` — routes, roles, nav
- `seed/types.json` — type definitions Portal needs upserted on install
- No DB migrations, no owned tables

### App data model principle

> Apps never touch DB structure. Apps upsert type records into core's `types` table using `design_schema` to define their data shape.

Cortex and Portal share the same core tables (`items`, `types`, `accounts`, `people`). They are independent — no imports between them.

### Seed data constraints

> `seed/*.json` files are **additive only** — they insert or update data, never alter DB structure. All upserts use `ON CONFLICT DO NOTHING` or `ON CONFLICT ... DO UPDATE` keyed on `(app_id, kind, slug)`.

Install order of Cortex and Portal is undefined — either may be installed first, or neither. Since each app's types are keyed by its own `app_id`, there is **zero collision risk** between apps regardless of install order. Each seed file must be fully self-contained and idempotent.

---

## Phases

### Phase 1: Merge + Production Validation
**Goal:** Ship current state to prod, verify nothing is broken before forking.

**Checklist:**
- [ ] Migrations 014 (webhook registry) and 015 (apps table simplify) applied in prod
- [ ] All apps load correctly (manifest-driven routing works)
- [ ] Webhook registry doesn't break existing integrations
- [ ] Boundary check passes (`npm run test:boundary`)
- [ ] Demo site functional

**Branch:** `main`  
**Timeline:** Before demo (2 weeks)

---

### Phase 2: Fork for npm Work
**Goal:** Protect the stable demo branch while doing structural npm work.

**Actions:**
- Create branch `v0-npm-packages` from `main` after Phase 1 merges
- All Phases 3–6 happen on `v0-npm-packages`
- `main` remains the demo-stable branch
- Merge back only when end-to-end install story is verified

**Branch:** `v0-npm-packages`

---

### Phase 3: Migrations Audit + Foundation SQL
**Goal:** Single authoritative schema for a fresh install. The critical path item — nothing else in this plan works without it.

**Decisions to make before writing SQL:**
- [x] ~~Include `links` table in core?~~ **Resolved: yes.** `links` and `link_types` already exist in production with 21 rows. Goes in `000_foundation.sql`.
- [ ] Which types are core seed data vs app seed data? System roles yes. Default item types — draw the line.
- [ ] RLS policy audit — capture all policies explicitly (easily missed in schema dumps)
- [ ] ⚠️ `account_paths`, `test_runs`, `test_results` have RLS disabled — decide on policies before including in foundation SQL

**Deliverables:**
- [ ] Audit document: current live DB schema vs migration files — flag all drift
- [ ] `000_foundation.sql` — creates all core tables, indexes, constraints, RLS policies, functions, triggers in correct dependency order. **Confirmed tables (34 total):** `accounts`, `people`, `types`, `apps`, `roles`, `items`, `threads`, `messages`, `links`, `link_types`, `attachments`, `watchers`, `pipelines`, `pipeline_executions`, `triggers`, `trigger_executions`, `timers`, `ai_agents`, `embeddings`, `integrations`, `prompt_configs`, `api_keys`, `api_key_usage_logs`, `logs`, `actions`, `schedules`, `schedule_executions`, `account_paths`, `test_runs`, `test_results`, `item_progress`, `webhook_handlers`, `app_installations`, `embeddings`
- [ ] `001_seed.sql` — inserts: system roles, core link types (`account_signals`, `account_opportunities`), bootstrap data core needs to boot. **App-owned link types (`tagged_with`, `analyzed_by`) go in app seed, not here.**
- [ ] Old migrations moved to `archive/migrations/` with a `README` marking them historical

**Verification:**
```bash
# Must pass: blank Supabase project + run 000 + 001 = working app
spine-framework init   # runs 000_foundation.sql then 001_seed.sql
```

> `spine-framework init` also scaffolds the `custom/` workspace structure (see Phase 5).

---

### Phase 4: Separate Core, Cortex, Portal
**Goal:** Each is an independently packageable unit with no cross-contamination.

**⚠️ Live DB corrective migration required (before Phase 5):**
The live production DB has schema drift that must be corrected before packaging. A dedicated migration is needed:
- `anonymous_session`, `funnel_signal`, `opportunity_queue`, `funnel_aggregation`, `kb_tag` types have `app_id = NULL` — must be updated to `app_id = cortex`
- `account_signals`, `account_opportunities` link types have `app_id = NULL` — must be updated to `app_id = cortex` (funnel is not a core framework concept)
- `Funnel Signal Lead Scoring` trigger has `app_id = spine-core` — must be updated to `app_id = cortex`
- `Funnel: Aggregation`, `Funnel: Score Decay`, `Funnel: Session Cleanup` triggers have `app_id = NULL` — must be updated to `app_id = cortex`
- The `unidentified-visitors` account exists in the live DB but was not in any seed file — now captured in `custom/apps/cortex/seed/accounts.json`
- `Community: Unanswered to Ticket` trigger has `app_id = NULL` — must be updated to `app_id = customer-portal`
- All five Cortex triggers captured in `custom/apps/cortex/seed/triggers.json` (including `Case Resolution Analysis`)
- Portal trigger captured in `custom/apps/customer-portal/seed/triggers.json`

**No hardcoded UUIDs rule:**
> Custom app code must never hardcode UUIDs. UUIDs are install-specific — they will differ on every fresh install. All ID references must be resolved at runtime by slug/name lookup. This applies to: type IDs, link type IDs, account IDs, agent IDs, prompt config IDs, and person IDs.
>
> **Pattern:** Replace `const TYPE_ID = 'uuid'` with a helper like `resolveTypeId(db, 'item', 'kb_article')` that queries `SELECT id FROM types WHERE kind=$1 AND slug=$2`.

- [ ] Audit all `custom/functions/` and `custom/apps/` for hardcoded UUIDs — replace with slug-based runtime lookups
- [x] ~~Complete UUID inventory~~ **Done (May 29, 2026)** — 11 locations identified across 8 files (see below)

**UUID fix inventory** (all must be resolved before Phase 5):

| File | UUID | Resolves to | Fix |
|------|------|-------------|-----|
| `custom_funnel-signal.ts` | `TYPE_IDS.*` (3) + `LINK_TYPE_IDS.*` (2) + `UNIDENTIFIED_VISITORS_ACCOUNT_ID` | item/funnel_signal, item/anonymous_session, item/opportunity_queue, link_types, account/unidentified-visitors | Slug lookup at startup |
| `custom_anonymous-sessions.ts` | `TYPE_IDS.*` (3) + `LINK_TYPE_IDS.*` (2) | Same as above | Slug lookup at startup |
| `custom_funnel-timers.ts` | `TYPE_IDS.*` (3) + inline `opportunity_queue` UUID | item/anonymous_session, item/funnel_signal, item/funnel_aggregation, item/opportunity_queue | Slug lookup at startup |
| `custom_support-triage.ts` | `TRIAGE_AGENT_ID`, `PROMPT_CONFIG_ID`, `SUPPORT_TICKET_TYPE_ID`, `THREAD_TYPE_ID`, `MESSAGE_TYPE_ID`, `KB_PLATFORM_ACCOUNT_ID` | ai_agent/name='Support Triage Agent', prompt_config/slug='support_triage_config', types by slug, account/spine-system | Slug/name lookup at startup |
| `custom_kb-ingestion.ts` | `kb_article` type UUID, `created_by` person UUID | item/kb_article, person (use service role — drop `created_by` hardcode) | Slug lookup; remove hardcoded person |
| `custom_kb-embeddings.ts` | `kb_article` type UUID, `KB_PLATFORM_ACCOUNT_ID` | item/kb_article, account/spine-system | Slug lookup at startup |
| `cortex/pages/kb/KBEditorPage.tsx` + `RedactionReview.tsx` + `customer-portal/KBGenerator.tsx` | `kb_article` type UUID (×3) | item/kb_article | useTypeId hook |
| `cortex/pages/courses/CoursesPage.tsx` | `message` type UUID | message/message | useTypeId hook |

**Core separation:**
- [ ] Verify `.framework/` has zero imports from `custom/`
- [ ] Verify `.framework/` has zero Cortex/Portal-specific references
- [ ] Boundary check extended to catch Cortex↔Portal cross-imports

**Cortex separation:**
- [ ] All Cortex frontend confirmed in `custom/apps/cortex/`
- [ ] Extract Cortex type definitions from live DB → `custom/apps/cortex/seed/types.json`
- [ ] Extract Cortex link types (`tagged_with`, `analyzed_by`) → `custom/apps/cortex/seed/link-types.json`
- [x] ~~Verify no Portal imports in Cortex~~ **Confirmed clean** (validated May 28, 2026)
- [x] ~~Verify Cortex imports only from `@core` and its own files~~ **Confirmed clean**

**Portal separation:**
- [ ] All Portal frontend confirmed in `custom/apps/customer-portal/`
- [ ] Extract Portal type definitions from live DB → `custom/apps/customer-portal/seed/types.json`
- [ ] Extract any Portal-owned link types → `custom/apps/customer-portal/seed/link-types.json`
- [x] ~~Verify no Cortex imports in Portal~~ **Confirmed clean** (validated May 28, 2026)
- [x] ~~Verify Portal imports only from `@core` and its own files~~ **Confirmed clean**

**End state directory map:**
```
spine-framework/          ← becomes the spine-framework npm package
  .framework/
    functions/
    src/
    migrations/
      000_foundation.sql
      001_seed.sql
    cli/

spine-framework-cortex/   ← becomes the spine-framework-cortex npm package
  manifest.json
  index.tsx
  components/
  pages/
  seed/
    types.json

spine-framework-portal/   ← becomes the spine-framework-portal npm package
  manifest.json
  index.tsx
  components/
  pages/
  seed/
    types.json
```

---

### Phase 4b: Test Harness
**Goal:** Core tests run standalone without custom code present. Custom developers have test utilities to verify their own code.

**Core test isolation:**
- [ ] `npm run test:core` — runs `.framework/` unit + integration tests with no `custom/` present
- [ ] `npm run test:custom` — runs custom tests with core present
- [ ] `npm run test:full` — full integration suite
- [ ] CI boundary check (`boundary-check.yml`) — blocks PRs where `.framework/` imports from `custom/`

**Test utilities for custom developers:**
- [ ] `.framework/functions/_shared/testing.ts` — exports `makeTestContext`, `mockPrincipal`, `cleanup`
- [ ] `custom/tests/helpers.ts` — custom test harness that imports from core testing utilities

**Verification:**
```bash
# Must pass with custom/ directory removed
npm run test:core

# CI guard — must return empty
grep -r "from.*custom/\|import.*@custom" .framework/ --include="*.ts"
```

> `spine-framework init` scaffolds a blank `custom/` workspace on first run, giving developers a ready-to-use structure:
> ```
> custom/
>   apps/       ← install-app drops activated packages here
>   functions/  ← blank, ready for custom Netlify functions
>   tests/      ← blank, with helpers.ts pre-seeded from core
> ```
> This follows the `rails new` / `create-react-app` pattern — framework sets up the container, developer fills it.

---

### Phase 4c: Developer Documentation
**Goal:** Public API surface is documented and stable. A developer building on Spine has a complete self-service guide.

**API surface:**
- [ ] Audit `.framework/functions/_shared/index.ts` — add `@stability` annotations (`stable` / `evolving` / `internal`) to all exports
- [ ] `.framework/API.md` — complete API reference listing all stable exports with signatures and descriptions
- [ ] `.framework/STABILITY.md` — versioning policy and breaking change guidelines

**Framework developer guide:**
- [ ] `docs/framework-developer-guide.md` — covers: Getting Started, Core Concepts (principals, contexts, permissions, pipelines), Extension Points, API Reference, Testing, Patterns, Troubleshooting
- [ ] `docs/examples/custom-function/` — minimal Netlify function using core context
- [ ] `docs/examples/custom-app/` — minimal app with manifest + routing
- [ ] `docs/examples/custom-webhook/` — webhook handler registration pattern

**API doc generation:**
- [ ] `package.json` — add `docs:generate` script (TypeDoc from `_shared/index.ts`)

---

### Phase 5: npm Packages
**Goal:** Three publishable packages with working install flows.

**spine-framework package.json additions:**
```json
{
  "name": "spine-framework",
  "version": "0.1.0",
  "private": false,
  "bin": {
    "spine-framework": "./dist/cli/index.js"
  },
  "exports": {
    "./_shared": "./dist/functions/_shared/index.js",
    "./src/*": "./dist/src/*"
  }
}
```

**spine-framework-cortex / spine-framework-portal package.json:**
```json
{
  "name": "spine-framework-cortex",
  "version": "0.1.0",
  "private": false,
  "peerDependencies": {
    "spine-framework": ">=0.1.0"
  }
}
```

**CLI commands to build/verify:**

| Command | Description |
|---------|-------------|
| `spine-framework init` | Run 000 + 001 migrations + scaffold `custom/` workspace |
| `spine-framework migrate` | Run pending migrations |
| `spine-framework install-app <package-name>` | Activate an installed npm app package into `custom/apps/` + upsert its seed data |
| `spine-framework uninstall-app <package-name>` | Remove app from `custom/apps/` + remove its seed data |
| `spine-framework create-app <slug>` | Scaffold a new custom app |
| `spine-framework status` | Show installed apps and migration state |

**App install model:**
App packages are distributed via npm (public or private registry). `install-app` is a generic activation command — it reads the package from `node_modules/` and copies it into `custom/apps/`. The CLI help exposes no package names:

```bash
# Developer flow
npm install spine-framework-cortex          # npm handles auth + distribution
spine-framework install-app cortex           # CLI activates from node_modules/
```

Paid apps use **private npm registries** (scoped package + auth token). The access gate is the registry, not the CLI — `spine-framework --help` never lists specific app package names. This keeps the commercial boundary clean.

**Semantic versioning:**
- [ ] `.framework/package.json` — add `version` field (e.g. `0.1.0`)
- [ ] `.framework/functions/system.ts` — add `/api/system?action=version` endpoint returning `{ version, api_level, deprecated[] }`
- [ ] Deprecation warning system — `@deprecated` decorator in `_shared/index.ts` logs warnings + writes to audit log when deprecated APIs are called

**Build pipeline:**
- [ ] Add `tsc` build step for functions and CLI → `dist/`
- [ ] Add Vite library mode build for frontend components → `dist/src/`
- [ ] Generate `.d.ts` type declarations
- [ ] `prepublishOnly` script runs build + `scripts/boundary-check.sh` + `npm run test:core`

**Registry:** GitHub Packages (private) first. Public npm only after end-to-end install verified.

---

### Phase 6: End-to-End Install Verification
**Goal:** Prove the install story works from a completely blank starting point. Must pass before any publish.

**Fresh install checklist:**
- [ ] Blank Supabase project (no existing schema)
- [ ] `npm install spine-framework`
- [ ] `spine-framework init` → DB schema created, seed data present, app boots
- [ ] Admin panel functional
- [ ] `spine-framework install-app spine-framework-cortex` → Cortex loads, type records seeded
- [ ] `spine-framework install-app spine-framework-portal` → Portal loads, type records seeded
- [ ] Both apps functional and independent
- [ ] `spine-framework create-app my-test` → scaffolds correctly
- [ ] `npm run assemble && netlify dev` → dev server runs cleanly

**This checklist is the publish gate. All items must pass.**

**Rollout strategy (after checklist passes):**
1. **Internal dogfooding** — migrate existing custom code to new install patterns, verify in dev
2. **Documentation preview** — share developer guide with select developers for feedback
3. **Gradual migration** — onboard one app at a time to the package model
4. **Announcement** — framework ready for multi-team development, publish to npm public

---

### Phase 7: Documentation
**Goal:** A developer or agentic IDE can go from zero to running in one session.

**Docs needed:**

| Document | Audience |
|----------|---------|
| Getting Started (from zero) | New developer / agentic IDE |
| `spine-framework init` walkthrough | Developer |
| Installing apps | Developer |
| Building a custom app | Developer (dev-guides already exist) |
| Core API reference | Developer (API.md exists, extend) |
| Upgrade guide | Existing Spine developer |
| Contributing to core | Core contributor |

---

## Success Metrics

Publish readiness: all "After" states must be true before Phase 6 gate passes.

| Metric | Before | After |
|--------|--------|-------|
| Core→custom imports | 1+ | 0 |
| App-specific components in core | 2+ | 0 |
| `app_definitions` table columns | 15+ | 4 (migrated to `app_installations`) |
| App metadata source | Database JSON blob | `manifest.json` in each app |
| Core test independence | Fails without `custom/` | Passes standalone (`npm run test:core`) |
| API documentation coverage | 0% | 100% of `_shared/index.ts` exports |
| Framework developer guide | None | Complete with working examples |
| Boundary enforcement | Manual grep | CI/CD automated (`boundary-check.yml`) |
| Version compatibility | Unknown | Semver + `/api/system?action=version` API level |
| Fresh install story | Not possible | `npm install spine-framework && spine-framework init` boots a working app |

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Version target | `0.x` | Breaking change freedom until stable |
| CLI namespace | `spine-framework` only | No shorthand aliases |
| App DB model | Type records only, no app-owned tables | Clean install, clean uninstall, no schema drift |
| Cortex ↔ Portal | Fully independent, no cross-imports | Each is self-sufficient |
| Shared type records | Both apps use same core tables | Core owns schema, apps own their type definitions |
| Registry | GitHub Packages (private) → npm (public) | Validate before exposing |
| Links table | **In core** — `links` + `link_types` in `000_foundation.sql` | Already live in production with 21 rows. `app_id` column on `link_types` distinguishes core vs app-owned relationship types. |
| App-owned link types | Seeded by app (`seed/link-types.json`), not by core | `tagged_with`, `analyzed_by` are Cortex-owned; `account_signals`, `account_opportunities` are core-owned |
| App seed safety | Additive/upsert only, order-independent | `ON CONFLICT DO NOTHING` keyed on `(app_id, kind, slug)` — no collision risk between apps |
| `install-app` command | Generic — takes any package name | Paid apps use private npm registry for access control; CLI help never exposes package names |
| `spine-framework init` scaffolding | Scaffolds `custom/` workspace on first run | Blank `custom/apps/`, `custom/functions/`, `custom/tests/` ready for developer use |

---

## Open Questions

1. **Supabase project config** — How does `spine-framework init` know which Supabase project to target? `.env` file, interactive prompt, or CLI flag?
2. **Assembly in package model** — Does `assemble.sh` read from `node_modules/spine-framework-cortex/` after install, or does `install-app` copy files into `custom/apps/`? Copy is simpler and matches current model.
3. **Frontend build** — Does `spine-framework` ship pre-built frontend components (library mode) or source that gets assembled into the host project? Source + assemble matches current model and avoids Vite/React version conflicts.
4. **RLS on `account_paths`, `test_runs`, `test_results`** — These 3 tables have RLS disabled in production. Decide on policies before writing `000_foundation.sql`. Without policies, enabling RLS will block all access.

---

## Related Documents

- `docs/enterprise-framework-implementation-summary.md` — current state of enterprise framework work (superseded by this plan for forward work)
- `docs/framework-developer-guide.md` — framework developer guide (Phase 4c deliverable)
- `docs/dev-guides/` — existing developer guides for building on Spine
- `.framework/API.md` — public API surface (Phase 4c deliverable)
- `.framework/STABILITY.md` — versioning policy and breaking change guidelines (Phase 4c deliverable)
- `.framework/migrations/` — canonical migration files (`000_foundation.sql`, `001_seed.sql`)
- `scripts/boundary-check.sh` — architectural boundary enforcement
