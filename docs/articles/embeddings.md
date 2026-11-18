---
title: "Why `embeddings` exists"
kind: narrative
verified_against: f6aed7f
verified_on: 2026-11-13
extends: .framework/src/instructions/kb.md
source_files:
  - .framework/migrations/001_core_schema.sql
---

# Why `embeddings` exists

Semantic retrieval — "find the article that answers this" — needs vectors. But retrieval also needs tenancy, lifecycle, and provenance. `embeddings` is the governed vector index: searchable content lives account-scoped, lifecycle-managed, and provider-swappable, inside the same boundary as everything else.

## The five whys

1. **Why a vector table instead of external search?** Retrieval must scope to `account_id` and join to governed records — an external store re-implements tenant isolation and can't RLS.
2. **Why `approved_at`/`revoked_at` instead of delete?** Embedding lifecycle is content lifecycle — unpublish an article and its embeddings should stop matching *without* erasing history.
3. **Why `content_hash`?** Re-ingesting unchanged content shouldn't re-embed — the hash is the dedup key (`kbIngest` skips unchanged documents).
4. **Why `document_id` + `chunk_index`?** Documents embed as chunks — retrieval returns the relevant fragment with provenance back to the source record.
5. **Root:** retrieval is a platform capability like files or notifications — `embeddings` is the governed vector index where searchable content lives account-scoped, lifecycle-managed, and provider-swappable.

## What it actually is

Defined in `.framework/migrations/001_core_schema.sql` (~line 259):

```sql
account_id uuid NOT NULL, model_id text,
document_id text, chunk_index integer,
content text, embedding vector(1536),
approved_at, revoked_at, content_hash
```

`kb.ts` manages the lifecycle: `kbIngest` claims a `document_leases` row (content-hash dedup), chunks, embeds, writes; `kbRevoke` soft-revokes. Retrieval flows through the agent runner's document tools for prompt-scoped answers.

## How you'd use it

```tsx
await apiFetch('/api/admin-data?entity=items&action=kb_ingest', {
  method: 'POST',
  body: JSON.stringify({ id: articleId })
})
```

## Who it's for

**Developers:** semantic search over governed records is a platform call — no vector DB to operate, no tenancy to re-derive. **Agencies:** client knowledge is searchable inside their isolation boundary — retrieval can't leak across accounts because it's the same RLS boundary as every row.

## In one sentence

`embeddings` is retrieval inside the tenancy boundary, lifecycle-managed.

---

*Agent-facing chain now lives in `.framework/src/instructions/kb.md` — `## Problem it solves`.*
