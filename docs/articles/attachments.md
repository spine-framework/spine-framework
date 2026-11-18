---
title: "Why `attachments` exists"
kind: narrative
verified_against: 16d9a06
verified_on: 2026-11-13
extends: .framework/src/instructions/runtime-collaboration.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `attachments` exists

"This record has files" is universal — tickets get screenshots, records get contracts, messages get documents. `attachments` provides it once, governed, instead of per-type file columns and bespoke upload paths.

## The five whys

1. **Why not file fields per type?** Per-type files mean per-type upload, storage, and permission plumbing for a capability every record can need.
2. **Why metadata instead of blobs?** Binary lives in object storage (`storage_path` + `storage_provider`); the row holds what queries need — filename, size, mime, provenance. Database rows don't scale to binaries; object storage doesn't do permissions.
3. **Why typed attachments (`type_id`)?** Apps declare kinds — invoice vs screenshot vs contract — each with its own schema and permissions.
4. **Why `uploaded_by` + `account_id` + RLS?** Files are the most common data-leak vector. Access control must ride on the same account-scoping and permission machinery as every other record, not a bespoke file ACL.
5. **Root:** files are a capability every domain needs but none should rebuild — the attachment row decouples "this record has files" (governed data) from "the file's bytes" (provider storage), so storage stays swappable and access stays governed.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (~line 115):

```sql
type_id uuid NOT NULL, account_id uuid NOT NULL,
filename text NOT NULL, file_size integer, mime_type text,
storage_path text, storage_provider text DEFAULT 'supabase',
uploaded_by uuid
```

CRUD via `/api/admin-data` — same validation, permissions, triggers, and audit as every other governed entity.

## How you'd use it

Upload bytes to storage, then register the attachment row:

```tsx
await apiFetch('/api/admin-data?entity=attachments', {
  method: 'POST',
  body: JSON.stringify({
    entity: 'attachments', type_slug: 'invoice',
    filename: 'inv-0042.pdf', mime_type: 'application/pdf',
    file_size: 184320, storage_path: 'account/x/inv-0042.pdf'
  })
})
```

## Who it's for

**Developers:** file handling reduces to "upload bytes + insert a governed row." **Agencies:** the storage provider is a column, not a commitment — client files can move providers without app changes, and RLS covers files by default.

## In one sentence

`attachments` separates governed file metadata from swappable byte storage.

---

*Agent-facing chain now lives in `.framework/src/instructions/runtime-collaboration.md` — `## Problem it solves`.*
