---
title: "Spine Framework"
kind: index
verified_against: 14204c5
verified_on: 2026-11-23
source_files:
  - package.json
  - .framework/src/instructions/
  - netlify.toml
---

# Spine Framework

Spine Framework is a multi-tenant application platform that gives you the
boring 80% of a SaaS product — auth and tenancy, RBAC, typed runtime records,
pipelines/triggers/timers, integrations, a schema-driven admin UI, and
observability — so you and your AI coding agent build only the 20% that makes
your app unique. It is designed to be developed on with agentic IDEs: `init`
writes an `AGENTS.md` rules file, a set of `.devin/skills/spine-*` procedures,
and ships a complete instruction book that your agent reads while it works.

The stack is deliberately conventional: React + Vite frontend, Netlify
Functions as the API layer, Supabase (Postgres + Auth) as the database.

## Quick start

```bash
npm create spine-framework@latest my-app
cd my-app
```

The first run can sit silent for 10–30 seconds while npx fetches the
scaffolder package — that's a download, not a hang.

That runs `spine-framework init` for you. The manual equivalent:

```bash
mkdir my-app && cd my-app
npm install spine-framework
npx spine-framework init
```

Installing a local tarball or pre-release? `npm i ./spine-framework-<ver>.tgz`
works too — `init` preserves the `file:` spec in `package.json` instead of
stamping a registry version.

`init` copies the framework file set (`.framework/`, `config/`, `scripts/`,
`bin/`), writes `package.json` / `netlify.toml` / `spine.config.json` /
`.env.example`, creates an empty `custom/` workspace for your code, and
freezes a `.spine-manifest.json` integrity manifest. It does **not** run
`npm install`, write `.env`, or touch your database.

### 1. Configure `.env`

```bash
cp .env.example .env
```

Required for a working install (full list:
[`.framework/src/instructions/reference/env-vars.md`](.framework/src/instructions/reference/env-vars.md)):

| Variable | Used by |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | the browser app |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Netlify functions + CLI |
| `SUPABASE_DB_PASSWORD` | `npx spine-framework migrate` (direct Postgres) |
| `APP_BASE_URL` | invite links and auth redirects (`http://localhost:8888` in dev) |

The Supabase URL and both keys are under **Project Settings → API Keys**
(dashboard "Publishable key" = anon, "Secret key" = service-role);
`SUPABASE_DB_PASSWORD` is under **Project Settings → Database**.

Worth setting early: `INTERNAL_INVOKE_SECRET` — required for
trigger-dispatched pipelines (`openssl rand -hex 32`).

### 2. Install, verify, migrate

```bash
npm install
npm run verify                  # integrity-checks the tree against .spine-manifest.json
npx spine-framework migrate     # creates tables, RLS, seeds system data (idempotent)
```

### 3. Run it

```bash
npm run dev:netlify             # Netlify dev server on http://localhost:8888 (functions + UI)
```

`npm run dev:vite` starts only the Vite dev server on port 3001 — fine for
frontend work, but `/api/*` calls still proxy to 8888, so functions need
`netlify dev` running. (`npm run dev` is an alias for `dev:netlify`.)

### 4. First login

Browser path: open `http://localhost:8888`, go to `/register`, and create an
account — **the first registrant becomes `system_admin`** via a database
trigger, and lands on `/spine-framework/admin`, the schema-driven admin app.
Later signups get no account or role until an invite or an admin places
them. Requires **Supabase email confirmation OFF** (Auth → Providers) or a
real inbox for the confirm link.

Headless path (scriptable): `npx spine-framework bootstrap --email
you@example.com --password '<pick-one>'` creates the first `system_admin`,
a confirmed auth user, and a `sk_` API key — no browser or email
confirmation needed. See
[`guide/01-install-and-first-run.md`](.framework/src/instructions/guide/01-install-and-first-run.md).

## Where's the documentation

The package ships a complete instruction book at
[`.framework/src/instructions/README.md`](.framework/src/instructions/README.md):

- **`guide/`** — install, project map, domain model, build your first app.
- **`concepts/`** — tenancy, permissions, design schema, automation,
  observability.
- **`tasks/`** — single-goal procedures (add a type, a pipeline, a trigger,
  an AI agent; package and install an app; write a function or migration).
- **`reference/`** — env vars, CLI, API endpoints, design-schema spec.
- **`operations/`** — deployment, migrations, security checklist,
  troubleshooting playbook.
- **Root entity files** — one per entity (`types`, `apps`, `roles`,
  `pipelines`, `triggers`, `ai-agents`, …), all in the same 7-section format.

The same files render inside the admin UI: every admin page has an
**Instructions** button that opens the relevant doc as a sheet.

## For AI agents

Spine is designed to be developed on *by* agents — the canonical statement
lives in `docs/articles/spine-framework.md` (the section the marketing site
pulls for `llms.txt`). After `init`, your repo contains everything an agent
needs:

- **`AGENTS.md`** — the standing rules: `.framework/` is sealed, all
  runtime-record CRUD goes through `/api/admin-data`, migrations only for
  schema, `record_permissions` keys match `roles.slug` verbatim.
- **`.devin/skills/spine-*`** — task procedures (`spine-install`,
  `spine-new-type`, `spine-new-app`, `spine-add-automation`, `spine-ship`,
  `spine-operate`, `spine-troubleshoot`, …).
- **`.framework/src/instructions/`** — the instruction book above.
- **`.github/workflows/spine-ci.yml`** — a shipped CI gate (verify →
  typecheck → test → build); add your own alongside it.

Useful CLI for agents:

```bash
npx spine-framework validate-schema <file.json>   # check a design_schema file
npx spine-framework validate-app custom/apps/<slug>   # check an app package
```

Point your agent at `guide/03-domain-model.md` and `concepts/` first — it
explains the primitives and how they compose. Support:
support.spine-framework.com.

## CLI quick reference

All commands run as `npx spine-framework <command>`. Full reference:
[`.framework/src/instructions/reference/cli.md`](.framework/src/instructions/reference/cli.md).

| Command | What it does |
|---|---|
| `init [dir]` | Scaffold a project (refuses to run over an existing `.framework/`) |
| `migrate` | Apply pending SQL migrations; `--dry-run`, `--framework-only` |
| `status` | Show installed apps and framework version |
| `install-app <pkg>` | Install an app package into `custom/apps/` + register/seed it |
| `validate-schema <file>` | Validate a `design_schema` JSON file |
| `validate-app [path]` | Validate an app package's structure and manifest |
| `doctor` | Check installation health (env, files, DB reachability) |
| `bootstrap` | Create the first `system_admin` + confirmed auth user + `sk_` key, no browser |
| `upgrade` | Sync framework files to the installed package version; `--dry-run`, `--force` |
| `dev` | Assemble + verify, then start Vite (`--netlify` for functions + UI on :8888) |
| `test [suite]` | Run Vitest suites; `--watch`, `--json` |
| `create-app <slug>` | Scaffold a custom app in `custom/apps/<slug>/` |
| `update-app <pkg>` | Re-copy an installed app's files + re-sync registration |
| `uninstall-app <pkg>` | Remove an app's files (never deletes seeded DB rows) |
| `seed-app <slug>` | Run only the manifest `seed` block + registration sync |
| `migrations list/status` | Show applied migrations / diff local files vs applied |

Runtime-data command groups (`auth`, `items`, `pipelines`, `agents`,
`system`) and full flag reference:
[`.framework/src/instructions/reference/cli.md`](.framework/src/instructions/reference/cli.md).

## Requirements

- Node.js ≥ 22.13, npm ≥ 10 (init stamps this floor into `.spine-manifest.json`)
- A [Supabase](https://supabase.com) project (URL + anon/service keys + DB password)
- Netlify CLI for local dev — pinned as a devDependency, so `npm install`
  provides it. A Netlify account/site is only needed to deploy to production.

## Upgrading

`.framework/`, `config/`, `scripts/`, and `bin/` are a managed copy — do not
edit them (`.spine-manifest.json` will flag it). To move to a newer release:

```bash
npm install spine-framework@latest
npx spine-framework upgrade --dry-run   # review what would change
npx spine-framework upgrade
npx spine-framework migrate             # apply any new migrations
```

Your code in `custom/` is never touched.

## Packages and repositories

| Package | Install | What it is |
|---|---|---|
| [`spine-framework`](https://www.npmjs.com/package/spine-framework) | `npm i spine-framework` | The framework itself — this repository. |
| [`create-spine-framework`](https://www.npmjs.com/package/create-spine-framework) | `npm create spine-framework@latest my-app` | Bare-project scaffolder (thin wrapper over `init`). |
| [`@spine-framework/answer-once`](https://www.npmjs.com/package/@spine-framework/answer-once) | `npm i @spine-framework/answer-once` | Answer Once customer-support app; installs into any Spine project. |
| [`@spine-framework/create-answer-once`](https://www.npmjs.com/package/@spine-framework/create-answer-once) | `npm create @spine-framework/answer-once@latest my-support` | One-step scaffold: framework + Answer Once. |

Repositories: [spine-framework/spine](https://github.com/spine-framework/spine)
(this repo — framework source and npm tooling) ·
[spine-framework/spine-framework](https://github.com/spine-framework/spine-framework)
(exact mirror of the published `spine-framework` package) ·
[spine-framework/answer-once](https://github.com/spine-framework/answer-once)
(standalone Answer Once deployment).

## Known issues

- **`npx spine-framework generate` was removed** — it wrote stubs to a dead
  `v2-custom/` tree and emitted a legacy `design_schema` shape. It now prints
  migration guidance and exits 1: use `npx spine-framework create-app` for
  apps, and author types in the admin UI or via `POST /api/types` (check the
  schema with `npx spine-framework validate-schema`). See "Removed commands"
  in [`reference/cli.md`](.framework/src/instructions/reference/cli.md).
- `npx spine-framework dev` runs the real dev flow: `scripts/assemble.sh`,
  integrity check, then Vite — the Vite-only equivalent of `npm run
  dev:vite` (`--netlify` for the full `netlify dev` stack on :8888,
  equivalent to `npm run dev:netlify`).
- No MCP server ships in the package today — agent integration is via
  `AGENTS.md`, skills, and the instruction book. (An MCP exists repo-side
  for framework development; whether it ships is a product decision.)

## License

Licensed under the
[Apache License 2.0](LICENSE.md) — free for any use, including commercial
software products (see spine-framework.com/software-license.html).
