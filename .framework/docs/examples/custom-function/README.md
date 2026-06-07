# Example: Custom Function

A minimal Netlify Function using Spine's core context system.

## Setup

1. Create `custom/functions/custom_my-handler.ts`
2. Import `createHandler` and `CoreContext` from `spine-framework/_shared`
3. Your handler receives a fully-resolved `CoreContext` with:
   - `ctx.principal` — authenticated user/machine identity
   - `ctx.db` — Supabase client (scoped to principal's permissions)
   - `ctx.accountId` — resolved account UUID
   - `ctx.requestId` — unique request trace ID

## Key Points

- **Naming convention:** Custom functions MUST be prefixed with `custom_`
- **No static imports from core:** Use the `spine-framework` package exports
- **Authentication is automatic:** `createHandler` validates the JWT/API key before your code runs
- **Database access:** Use `ctx.db` for RLS-scoped queries, or import `adminDb` for service-role operations

## API

```
GET/POST /.netlify/functions/custom_my-handler?action=list
Authorization: Bearer <jwt>
```
