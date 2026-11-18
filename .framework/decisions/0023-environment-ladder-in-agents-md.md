---
id: spine-framework:0023-environment-ladder
title: the environment promotion ladder lives in the customer-owned region of AGENTS.md
status: accepted
kind: decision
owner: package
since: 0.7.0
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - AGENTS.md
  - .framework/templates/agent/AGENTS.md
  - .framework/templates/agent/skills/spine-ship/SKILL.md
  - .framework/src/instructions/tasks/declare-your-environments.md
  - .framework/cli/lib/project-files.ts
enforced_by:
  - .framework/tests/unit/agent-files.test.ts
evidence:
  - { kind: doc, ref: "Owner direction, developer-lifecycle plan 2026-11-16 (docs/plans/developer-lifecycle.md, S4–S5): the ladder lives in the project-owned part of AGENTS.md; release starts only when the developer instructs after staging GREEN", label: source }
  - { kind: doc, ref: ".framework/cli/lib/project-files.ts mergeAgentsFile — everything after <!-- spine-framework:end --> is preserved verbatim on upgrade", label: mechanism }
provenance: captured
---

## Context

Every Spine project needs a way to say what "ship it" means: which
environments a change walks through, what gates each rung, and where an
agent must stop and wait for a human. The answer had to be readable by
humans and agents, survive `npx spine-framework upgrade`, and carry no new
schema or parser.

## Decision

The project's promotion ladder is a `## Environments` section written
**below** the `<!-- spine-framework:end -->` marker in `AGENTS.md` — the
region `mergeAgentsFile` preserves verbatim across upgrades. Rungs are
`### <n>. <name>` headings with fixed fields (`Target`, `Gate`,
`Promote by`, `Post-landing`, optional `Hand-off: stop`). The `spine-ship`
skill reads it, writes it once with the developer if absent, and never
crosses a `Hand-off: stop` rung without an explicit instruction.

## Invariant

An agent never promotes past the hand-off rung on its own initiative —
staging GREEN is a stopping point, not a launchpad. Ambiguous approval
("looks good") is not a release instruction.

## Alternatives rejected

- **A structured `environments` block in `spine.config.json`** — new
  schema, a new parser for every agent, and upgrade-safety of config
  merging unverified. The AGENTS.md region is already proven preserved.
- **A framework-shipped default ladder** — environments are inherently
  project-owned (targets, credentials, what "release" means). Shipping a
  default would assert facts the framework cannot know.

## Consequences

- The ladder format is documented once in
  `tasks/declare-your-environments.md`; `spine-ship` is the only consumer
  that must parse it.
- The monorepo's own ladder (`AGENTS.md`, local → spine-framework-dev →
  release) is the worked example; the `release` skill's Steps 4+ gate on
  the hand-off.
- A project that wants a different ladder shape can still write prose —
  `spine-ship` reads, it does not enforce a schema.
