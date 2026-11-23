---
id: spine-framework:0029-attachment-byte-path
title: attachment byte path — tmp quarantine + admin-data commit, images only
status: accepted
kind: decision
owner: package
since: 0.8.0
until: null
supersedes: null
superseded_by: null
links:
  - spine-framework:0001-admin-data-only
applies_to:
  - .framework/functions/attachments.ts
  - .framework/functions/_shared/attachments.ts
  - .framework/functions/_shared/storage.ts
  - .framework/functions/_shared/image-meta.ts
  - .framework/functions/admin-data.ts#create
  - .framework/src/lib/attachments.ts
enforced_by:
  - .framework/tests/unit/attachments.test.ts
evidence:
  - { kind: doc, ref: ".framework/src/instructions/reference/functions/attachments.md", label: source }
  - { kind: doc, ref: ".framework/src/instructions/runtime-collaboration.md", label: source }
provenance: captured
---

## Context

The `attachments` table (migration 001), seeded `attachment` type, RLS,
and docs shipped ahead of the mechanism: the row layer was governed but no
code moved bytes — `FieldRenderer` file fields stored a filename string and
dropped the `File`. Jason's Hikes hit this building a photo gallery and
worked around it with data-URLs. Developer requirements for the fix:
public AND private attachments, uploads only by authenticated users with
correct permissions, configurable type/size validation, and "tmp > cp
instead of direct upload" to keep storage hole-free. Images only for v1 —
explicitly no text, XML, SVG, or movies.

## Decision

**Bytes never take a direct path to their final location.** The client gets
a signed URL into a private `attachments-tmp` quarantine bucket only
(`upload-url` — authenticated, requires `create` on the resolved
attachment type, declared inputs checked against the type's
`file_policy`). The client PUTs bytes to quarantine, then calls
`admin-data` create with `tmp_path`. The create hook downloads the object,
verifies **actual** size and magic-byte mime, strips GPS EXIF per policy
(fail closed), writes to the final bucket at a server-generated path, and
stamps verified columns — `storage_path` is never client input, and the
row exists only if the bytes committed.

Reads: `read-url` loads the row through the caller's db — RLS for humans,
`assertRecordAccess` for machines — then returns the commit-stamped
`public_url` (public bucket, stable, SSR-embeddable) or a short-lived
signed URL (private bucket). Row delete cascades to the object; a daily
`system-cron` sweep reaps tmp objects older than 24h.

Policy lives on the attachment type's `design_schema.file_policy`
(allowed_mime, max_bytes, visibility, strip_gps) — apps own it via type
seeds; invariants (image-mime clamp, 50MB bucket ceiling) can't be relaxed
by config. Association to records is a `links` edge (`has_attachment`,
migration 083) or a `file`/`image` field storing the attachment row id.

## Alternatives rejected

- **Direct-to-final signed uploads** — the original sketch. A client with
  a write URL to a final path can re-PUT arbitrary bytes over a governed
  row, plant a row pointing at a path it never uploaded, or write outside
  its account. Quarantine + server commit closes all three.
- **A dedicated commit endpoint / HMAC commit token** — extra machinery
  for what `admin-data` create already is: the only row writer. Folding
  commit into create *strengthens* the admin-data-only rule instead of
  adding a second row-writing surface. Cost: an entity-specific branch in
  admin-data; it already has several.
- **`target_type`/`target_id` columns on attachments** — duplicates the
  link layer; "domain models are graphs" is why `links` exists.
- **Re-encode strip (sharp/imagemagick)** — strips everything and
  transcodes pixels plus a native-dep cost. Surgical GPS removal keeps
  originals (orientation, camera data) — members download them.
- **Allow-unstripped for formats we can't strip** — HEIC and friends
  don't enter the allowlist at all; fail closed beats document-around.
- **SVG as an image** — it's active content, not an image; magic-byte
  sniffing sees text and `allowed_mime` can't widen past the image set.

## Consequences

- Supabase Storage is now a required service — install guide updated;
  fixture config enables it; buckets lazy-create so installs without the
  service degrade to upload errors, not broken migrations.
- Image bytes transit the function once at commit (bounded by
  `max_bytes`, sub-second for 10MB) — a deliberate trade for GPS
  verification; video-class sizes would need revisiting.
- Public-bucket URLs are stable and unguessable, not revocable short of
  deleting the object — documented as obscurity-not-auth; apps choose
  `visibility: public` deliberately per type/field.
- Machine principals can upload only via `*:*` scope — same bypass as
  admin-data create; scoped keys fail the permission engine.
- Orphaned final objects (row deleted outside admin-data) are unhandled —
  sweeper only reaps tmp; a final-bucket sweep is the named follow-up.
