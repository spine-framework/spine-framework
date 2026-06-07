# Stability Policy

> Version target: **0.x** — breaking changes are allowed until 1.0.

## Stability Levels

Every exported symbol in `_shared/index.ts` is annotated with one of these levels:

| Level | Meaning | Breaking change policy |
|-------|---------|----------------------|
| **stable** | Safe for custom code to depend on | Minimum 1 minor version deprecation notice before removal |
| **evolving** | API may change between minor versions | No deprecation period required, but changelog entry mandatory |
| **internal** | Not exported; core-contributor only | May change without notice |

## Versioning

Spine follows [semver](https://semver.org/) with these conventions:

- **0.x.y** — Pre-stable. Breaking changes increment the minor version.
- **1.0.0+** — Stable. Breaking changes increment the major version.

## Deprecation Process

1. Mark the symbol with `@deprecated` JSDoc tag and a migration hint
2. Add a console warning on first use (once per process)
3. Remove after the next minor version bump

## What Counts as Breaking

- Removing or renaming an exported function/type from `_shared/index.ts`
- Changing function signatures (required params added, return type changed)
- Removing a CLI command or changing its required arguments
- Changing database table/column names in migration files
- Removing seed data keys from `seed/*.json` schemas

## What Does NOT Count as Breaking

- Adding new optional parameters to existing functions
- Adding new exports to `_shared/index.ts`
- Adding new CLI commands
- Adding new database tables or columns
- Performance improvements to existing functions
- Bug fixes (even if they change observable behavior that was clearly wrong)

## Release Checklist

1. `npm run test:boundary` — architectural boundaries intact
2. `npm run test:unit` — unit tests pass
3. Update `CHANGELOG.md` with breaking changes highlighted
4. Bump version in `package.json`
5. `npm run prepublishOnly` — build + test gate
6. `npm publish`
