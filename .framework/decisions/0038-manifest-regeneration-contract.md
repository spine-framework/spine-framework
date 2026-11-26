---
id: spine-framework:0038-manifest-regeneration-contract
title: npm run manifest regenerates format_version 1 manifests non-destructively
status: accepted
kind: decision
owner: package
since: 0.10.4
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - scripts/checksum-manifest.mts
  - .framework/cli/commands/doctor.ts
  - .framework/cli/lib/project-files.ts
enforced_by:
  - scripts/verify-integrity.sh
evidence:
  - { kind: report, ref: "downstream build 2026-11-26 (factory-1 G-001/G-002/G-004): on a clean 0.10.3 install, doctor's integrity check warned 'No manifest found' reading the retired v2 manifest.integrity.src field; npm run manifest — doctor's own fix hint — stripped agent_files/framework_dependencies and stamped framework_version from the project's npm init -y version:1.0.0, producing 'AGENTS.md block is v0.10.3, project is v1.0.0' drift", label: observed }
provenance: captured
---

## Context

Three defects shared one root: the shipped manifest contract
(`format_version: 1`, written by `writeFrozenManifest` at init/upgrade)
and the scripts that touch it had drifted apart.

- `doctor` `checkIntegrity` required `manifest.integrity.src` — a legacy
  v2 field no current writer emits — so a clean install could never
  report HEALTHY, and its fix hint pointed at `npm run manifest`.
- `npm run manifest` (`scripts/checksum-manifest.mts`) regenerated the
  manifest destructively: it dropped `agent_files`/`framework_dependencies`
  and derived `framework_version` from the *project's* `package.json`
  `version`, which `npm init -y` leaves at `1.0.0` — the single most
  common path into a project (G-004).
- The doctor `agent_files` check then compared the AGENTS.md block
  version (`0.10.3`) against the poisoned `framework_version` (`1.0.0`)
  and reported drift on an untouched install.

## Decision

- `checksum-manifest.mts` resolves `framework_version` from
  `node_modules/spine-framework/package.json` first, then the
  `spine-framework` dependency spec — never the project's own `version`.
- Regeneration **carries forward** `agent_files` and
  `framework_dependencies` from the existing manifest instead of dropping
  or recomputing them. `agent_files` records what init/upgrade *installed*
  — it is install-time state, not derivable from the current tree.
- `doctor` `checkIntegrity` accepts `format_version: 1` manifests at the
  project root, and its fix hint no longer routes through a destructive
  regeneration.

## Alternatives rejected

- **Recompute `agent_files` from the tree in checksum-manifest**:
  requires importing `collectAgentFileHashes`/`project-files.ts`, which
  already imports back from `checksum-manifest.mts` — a circular
  dependency for a value that is correct by construction (carry-forward).
- **Stamp `version: <frameworkVersion>` into the project's package.json
  at init** (G-004's `should_exist`): conflates the project's version
  with the framework's. Once the manifest stops reading project
  `version`, the drift class is gone without the conflation; a project
  may version itself independently.
- **Keep doctor on the v2 `integrity.src` shape for backwards
  compatibility**: the v2 writer is retired; validating a shape nothing
  emits is a permanent false negative, not compatibility.

## Consequences

- `npm run manifest` is idempotent repair, not degradation: rerun it and
  the manifest still carries agent hashes and the right version.
- A clean `npm init -y` + `init` + `doctor` sequence reaches HEALTHY.
- `agent_files` remains init/upgrade-owned — regeneration never invents
  or loses entries the installer wrote.
