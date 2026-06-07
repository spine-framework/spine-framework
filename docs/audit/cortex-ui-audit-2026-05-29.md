# Cortex UI Audit — 2026-05-29

**Auditor:** Cascade  
**Session:** casey@spine-internal.test  
**Env:** http://localhost:8888  
**Scope:** Dashboard, Accounts list, Account detail, Contacts list + click, Community

---

## Summary

The Cortex app loads and navigation works correctly. The **primary systemic issue** is that the `admin-data` API is stripping almost all fields from `accounts`, `people`, and `items` responses — returning only `id`, `created_at`, `updated_at`. Data is fully present in the database. This is a **`sanitizeRecordData` permission/RLS issue**, not missing data. Every page that depends on these entities is affected.

---

## Page-by-Page Findings

### 1. `/cortex/dashboard`
| | |
|---|---|
| **Status** | ✅ Renders |
| **Screenshot** | `audit-dashboard.png` |

**Observations:**
- Dashboard loads cleanly with metric tiles: Accounts (1), Open Tickets (0), Community Posts (4), KB Articles (1), Deals (0), Pipeline ($0k).
- Sidebar, breadcrumb, and nav all render correctly.
- No console errors. 2 pre-existing React Router v7 future flag warnings (non-blocking).
- Metric counts appear correct (they use count, not field data, so not affected by sanitization).

---

### 2. `/cortex/crm/accounts`
| | |
|---|---|
| **Status** | ⚠️ Page loads, data missing |
| **Screenshot** | `audit-accounts.png` |
| **API** | `GET /api/admin-data?action=list&entity=accounts&limit=500` → 200 OK |

**Observations:**
- Table renders with 3 rows but **Account name, Stage, Score, Temp** columns all show `—`.
- "3 accounts" count in heading is correct.
- Search and filter controls render but are non-functional (no data to filter).

**Root Cause — API response stripped:**
```json
{"data":[
  {"id":"aaaaaaaa-0001-0001-0001-000000000001","created_at":"...","updated_at":"..."},
  {"id":"aaaaaaaa-0002-0002-0002-000000000002","created_at":"...","updated_at":"..."},
  {"id":"12acec9b-8451-40e7-80d5-e80c4e2fc0de","created_at":"...","updated_at":"..."}
]}
```

**DB reality:** `accounts` table has `slug`, `display_name`, `data`, `is_active` — all populated (e.g. "Acme Corp", "Globex Inc", "Spine System"). Fields exist and are non-null in the DB but are absent from the API response.

**Suspected cause:** `sanitizeRecordData` in `admin-data.ts` is stripping all fields except `id`/timestamps for the `casey` user's role against the `accounts` entity.

---

### 3. `/cortex/crm/accounts/aaaaaaaa-0001-0001-0001-000000000001`
| | |
|---|---|
| **Status** | ❌ Hard crash — App Load Error |
| **Screenshot** | `audit-account-detail-error.png` |
| **API** | `GET /api/admin-data?action=get&entity=accounts&id=aaaaaaaa-0001-0001-0001-000000000001` → 200 OK |

**Console Error:**
```
TypeError: Cannot read properties of undefined (reading 'charAt')
  at AccountDetailPage (AccountDetailPage.tsx:700:260)
```

**API response (stripped):**
```json
{"data":{"id":"aaaaaaaa-0001-0001-0001-000000000001","created_at":"...","updated_at":"..."}}
```

**Root Cause:** `AccountDetailPage.tsx` line 700 calls `.charAt()` on a field (likely `account.slug` or `account.display_name`) that is `undefined` because the API stripped it. The component has no null-guard for this field.

**Two issues in play:**
1. API stripping fields (same root cause as accounts list).
2. Component lacks defensive null-check before calling string methods.

---

### 4. `/cortex/crm/contacts`
| | |
|---|---|
| **Status** | ⚠️ Page loads, data missing |
| **Screenshot** | `audit-contacts.png` |
| **API** | `GET /api/admin-data?action=list&entity=people&limit=200` → 200 OK |

**Observations:**
- Table renders with 4 rows. "4 contacts" count in heading is correct.
- **Name** column shows `—` for all rows.
- **Email** column is blank for all rows.
- **Joined** column shows `Invalid Date` for 3 rows (those without `created_at` in API response), and `4/27/2026` for 1 row (the existing admin user who has `created_at`).

**API response (stripped):**
```json
{"data":[
  {"id":"dddddddd-0001-0001-0001-000000000001"},
  {"id":"dddddddd-0003-0003-0003-000000000003"},
  {"id":"dddddddd-0002-0002-0002-000000000002"},
  {"id":"c230fe01-edf4-4e03-b455-c9cbac22b699","created_at":"...","updated_at":"..."}
]}
```

**DB reality:** `people` table has `email`, `full_name`, `is_active` — all populated. The three seeded test contacts (`alice@acme-corp.test`, `bob@globex-inc.test`, `casey@spine-internal.test`) exist with full data.

**Click behaviour:** Clicking a contact row **does not navigate** to a detail page. The row has a pointer cursor but no navigation occurs — no URL change, no detail panel. This appears to be an unimplemented click handler or missing route.

---

### 5. `/cortex/community`
| | |
|---|---|
| **Status** | ⚠️ Partial — structural issue |
| **Screenshot** | `audit-community.png` |
| **API** | `GET /api/admin-data?action=list&entity=items&type_slug=community_post&limit=500` → 200 OK |

**Observations:**
- Page layout renders correctly: 3-column layout with Channels sidebar, discussion list, thread panel.
- Channels sidebar shows: General (4), Announcements (0), Help (0), Show & Tell (0) — counts appear correct.
- Clicking **General** channel shows "No discussions yet" in the discussion list — **wrong**, there are 4 community posts in the DB.
- Moderation panel (right column) shows 4 "Unanswered" posts all titled **"Untitled"** — this is because `title` is stripped from the API response.

**API response (stripped):**
```json
{"data":[
  {"id":"18b38f42-...","created_at":"...","updated_at":"..."},
  ...
]}
```

**DB reality:** Items have real titles — e.g. "Help!", "Feature request: Dark mode support" — but `title` is absent from the API response.

**Additional issue:** The General channel shows a post count badge of 4 but clicking it shows "No discussions yet". The channel filtering logic may depend on `data.channel` or a `type_slug` sub-filter that isn't working correctly, or it depends on the stripped `title`/`data` fields to render posts.

---

## Systemic Root Cause

All data issues trace to a **single root cause**: the `sanitizeRecordData` function in the admin-data function is stripping all fields except `id`, `created_at`, and `updated_at` for the authenticated `casey` user's role when querying `accounts`, `people`, and `items`.

**Evidence:**
- DB has complete, populated data for all entities.
- API returns 200 OK but with stripped payloads.
- The one `people` record that retains `created_at` (`c230fe01` — the admin user) suggests RLS or field-level permission differences per record.
- The three seeded people records don't even return `created_at`, suggesting they may lack `is_active = true` records visible under RLS for this session, or have a different ownership/permission profile.

**Likely suspects:**
1. `sanitizeRecordData` in `_shared/` has a field allowlist/denylist that is too restrictive for the `operator` or `member` role that `casey` holds.
2. RLS policies on `accounts` and `people` tables may be preventing field reads.
3. The `admin-data` function's `select` clause may have an explicit field list that excludes key fields.

---

## Console Summary

| Level | Count | Details |
|---|---|---|
| Errors | 3 | All from `AccountDetailPage` crash — `TypeError: Cannot read properties of undefined (reading 'charAt')` at line 700 |
| Warnings | 2 | React Router v7 future flag warnings — pre-existing, non-blocking |

---

## Issues Ranked by Severity

| # | Severity | Issue | Affected Pages |
|---|---|---|---|
| 1 | 🔴 Critical | `sanitizeRecordData` stripping all fields from accounts/people/items API responses | Accounts, Contacts, Community, likely all entity lists |
| 2 | 🔴 Critical | `AccountDetailPage` crashes with `TypeError` on undefined string field (no null-guard) | Account detail |
| 3 | 🟠 High | Contact row click does not navigate — no detail route or handler wired | Contacts |
| 4 | 🟠 High | Community General channel shows "No discussions yet" despite 4 posts existing | Community |
| 5 | 🟡 Medium | Community moderation panel shows "Untitled" for all posts (title stripped) | Community |
| 6 | 🟡 Medium | Contacts "Joined" column shows `Invalid Date` for 3 of 4 records | Contacts |
| 7 | 🔵 Low | React Router v7 future flag warnings (non-blocking, pre-existing) | Global |

---

## Screenshots

| File | Page |
|---|---|
| `audit-dashboard.png` | `/cortex/dashboard` |
| `audit-accounts.png` | `/cortex/crm/accounts` |
| `audit-account-detail-error.png` | `/cortex/crm/accounts/:id` |
| `audit-contacts.png` | `/cortex/crm/contacts` |
| `audit-community.png` | `/cortex/community` |
