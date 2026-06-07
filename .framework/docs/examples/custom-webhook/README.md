# Example: Custom Webhook Handler

Demonstrates the self-registration pattern for webhook handlers.

## How It Works

1. Create a handler function in `custom/functions/custom_my-webhook.ts`
2. Register it by calling `registerWebhookHandler()` in `custom/functions/custom_webhook-handlers.ts`
3. Core resolves handlers at runtime via the `webhook_handlers` DB table — no static imports needed

## Handler Function

```ts
// custom/functions/custom_my-webhook.ts

import { createHandler } from 'spine-framework/_shared'
import type { CoreContext } from 'spine-framework/_shared'

export const handler = createHandler(async (ctx: CoreContext) => {
  const payload = ctx.body

  // Process the webhook payload
  console.log('Received webhook:', payload.event_type)

  // Do something with the data
  const { error } = await ctx.db
    .from('items')
    .insert({
      title: `Webhook: ${payload.event_type}`,
      type_id: await resolveTypeId('webhook_event'),
      account_id: ctx.accountId,
      data: payload,
    })

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
})
```

## Registration

```ts
// In custom/functions/custom_webhook-handlers.ts

import { registerWebhookHandler } from 'spine-framework/_shared/webhook-registration'

registerWebhookHandler({
  name: 'my-webhook',
  functionName: 'custom_my-webhook',
  description: 'Handles incoming webhooks from MyService',
  events: ['integration.webhook'],
}).catch(console.error)
```

## Integration Config

When configuring an integration in the admin panel, set:
- `handler.path` = `my-webhook` (matches the `name` in registration)

## Key Points

- **Self-registration is idempotent** — safe to call on every module load
- **No core changes needed** — just add your handler and register it
- **Runtime resolution** — core looks up handlers from `webhook_handlers` table via `resolveHandler()`
- **Events array** — currently `['integration.webhook']` is the standard event type
