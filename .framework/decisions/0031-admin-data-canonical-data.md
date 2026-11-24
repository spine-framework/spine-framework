---
id: spine-framework:0031-admin-data-canonical-data
title: admin-data returns canonical data values — formatting is renderer-side
status: accepted
kind: decision
owner: package
since: 0.10.1
until: null
supersedes: null
superseded_by: null
links: []
applies_to:
  - .framework/functions/_shared/permissions.ts#sanitizeRecordData
  - .framework/functions/admin-data.ts
enforced_by:
  - .framework/tests/unit/permissions.test.ts
evidence:
  - { kind: doc, ref: ".framework/src/instructions/reference/api/admin-data.md", label: source }
provenance: captured
---

## Context

`sanitizeRecordData` did two jobs: strip fields the principal cannot read,
and **display-format** the survivors — `boolean → 'Yes'/'No'`,
`datetime → locale string`, `json → stringified`, `currency → formatted`.
The formatting only ever ran for non-`system_admin` reads, i.e. exactly
the custom-app callers that need canonical values. Jason's Hikes hit it as
round-trip corruption: a member reading `data.is_rsvpd` got `'Yes'`, and
the app compensated with a `normalizeRecord` unmangler plus redeclaring
datetime fields as `text`.

The formatting was also redundant where it was intended: `FieldRenderer`
and `DataTable` format raw values client-side (Yes/No, timestamps, badges)
— nothing in the generic UI consumed the server's formatted strings.

## Decision

Sanitization filters, never transforms. `sanitizeRecordData` strips fields
denied by `design_schema.fields.*.permissions` and passes values through
as stored; display formatting belongs to the renderer layer
(`FieldRenderer`, `DataTable`, app components).

## Alternatives rejected

- **Format only on `view` requests** (`{data, schema, view}` envelope) —
  still corrupts the contract: the view envelope exists so apps can render
  generically, and those renderers format by `display_type` themselves.
- **Keep formatting, document it** — bakes a presentation concern into the
  one CRUD endpoint custom apps are required to use, and leaves every
  non-admin read writing formatted strings back into `data` fields on
  update round-trips.

## Consequences

- `data.<field>` values in admin-data responses are canonical: booleans are
  `true`/`false`, datetimes ISO strings, json is the parsed structure.
- Any client that adapted to formatted strings (unmanglers like
  `normalizeRecord`, `text`-typed datetime fields) can revert to typed
  `data_type` declarations on upgrade.
- Write-side `sanitizeFieldData` (input validation on update) is unchanged
  — it validates incoming values, it does not format stored ones.
