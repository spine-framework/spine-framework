/**
 * Example: Custom Netlify Function using Spine core context
 *
 * This demonstrates the minimal pattern for creating a custom function
 * that leverages Spine's authentication, database, and principal system.
 *
 * File: custom/functions/custom_my-handler.ts
 */

import { createHandler, adminDb } from 'spine-framework/_shared'
import type { CoreContext } from 'spine-framework/_shared'

/**
 * A simple handler that lists items for the current account.
 */
async function listAccountItems(ctx: CoreContext) {
  const { data, error } = await ctx.db
    .from('items')
    .select('id, title, type_id, created_at')
    .eq('account_id', ctx.accountId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ items: data }),
  }
}

/**
 * Netlify Function entry point.
 * `createHandler` resolves the principal, validates auth, and provides CoreContext.
 */
export const handler = createHandler(async (ctx) => {
  const { action } = ctx.params

  switch (action) {
    case 'list':
      return listAccountItems(ctx)
    default:
      return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) }
  }
})
