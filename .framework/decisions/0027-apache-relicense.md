---
id: spine-framework:0027-apache-relicense
title: relicense Spine Framework and Answer Once to Apache 2.0
status: accepted
kind: decision
owner: package
since: 0.7.0
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - LICENSE.md
  - package.json
  - README.md
  - .framework/README.md
  - docs/articles/spine-framework.md
  - custom/apps/answer-once/LICENSE.md
  - custom/apps/answer-once/package.json
  - custom/apps/answer-once/README.md
  - custom/apps/answer-once/docs/standalone-readme.md
  - custom/apps/demo/package.json
  - custom/npm/create-spine-framework/package.json
  - custom/npm/create-spine-framework/README.md
  - custom/npm/create-answer-once/package.json
  - custom/npm/create-answer-once/README.md
enforced_by: []
evidence:
  - { kind: doc, ref: "Owner instruction 2026-11-17: relicense to Apache 2.0, scope confirmed as framework + Answer Once", label: source }
  - { kind: doc, ref: "spine-framework.com/software-license.html already presented Apache 2.0 as the current license with BUL 2.0/BUL 1.0/IUL 1.0.0 listed as historical — shipped artifacts contradicted it", label: observed }
  - { kind: doc, ref: "npm spine-framework@0.6.1 and create-spine-framework@0.1.3 tarballs carried BUL 2.0; public mirror repo carried IUL 1.0.0 at 0.5.0-rc.4", label: observed }
provenance: captured
---

## Context

The license text diverged across surfaces: the marketing site claimed
Apache 2.0 while every shipped artifact carried the Spine Framework
Business Use License 2.0 (npm `spine-framework@0.6.1`,
`create-spine-framework@0.1.3`, repo `LICENSE.md`) or the older Internal
Use License 1.0.0 (the stale public mirror at `0.5.0-rc.4`). BUL 2.0's own
text deferred to `spine-framework.com/software-license.html` as the
current license — which contradicted the artifact. Answer Once carried a
separate Perpetual License (paid/evaluation model).

## Decision

Relicense **Spine Framework and Answer Once** to Apache License 2.0:

- `LICENSE.md` (repo root and `custom/apps/answer-once/`) carries the
  standard Apache 2.0 text with `Copyright 2026 Dahl Ventures Inc.`
- `package.json` `"license"` fields move from `SEE LICENSE IN LICENSE.md`
  to the SPDX identifier `Apache-2.0` (root, `custom/apps/*`,
  `custom/npm/*`; `package-lock.json` follows).
- All README/doc license sections state Apache 2.0.
- Earlier releases remain governed by their shipped licenses — Apache
  applies from the release cut after this record (`0.7.0` line).

## Alternatives rejected

- **Keep BUL 2.0, fix the website** — rejected by owner direction; Apache
  2.0 removes the "selling a Spine-powered product needs a commercial
  agreement" friction that gates agency/ISV adoption.
- **Framework Apache, AO stays Perpetual** — considered; owner chose a
  single license across both so the paid-license model ends and the
  site's existing claim becomes true rather than needing a correction.

## Consequences

- `stage-license.mjs` in both `create-*` packages continues to work —
  it copies repo-root `LICENSE.md`, which is now the Apache text.
- The `answer-once.com/license.html` Perpetual page becomes historical;
  the site needs the same treatment the framework license page got.
- Consumers on `<=0.6.x` remain under BUL 2.0 terms for those versions;
  upgrading to `0.7.x` moves them to Apache 2.0.
