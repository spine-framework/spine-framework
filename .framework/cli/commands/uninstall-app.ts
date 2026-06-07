/// <reference types="node" />
/**
 * @module cli/commands/uninstall-app
 * @audience installer
 * @layer cli
 * @stability stable
 *
 * `spine-framework uninstall-app <slug>` — Soft-uninstall an app.
 *
 * Deactivates the app's types, link types, and triggers in the database.
 * Does NOT delete data (items, threads, etc.) — those remain for audit.
 * Does NOT remove filesystem files — the app code stays in custom/apps/.
 *
 * To fully remove: manually delete the app directory after uninstall.
 *
 * **Usage:**
 * ```bash
 * spine-framework uninstall-app cortex
 * spine-framework uninstall-app cortex --hard   # Also deactivate items
 * ```
 */

import type { Command } from 'commander'
import { adminDb } from '../../functions/_shared/index.ts'

interface UninstallOptions {
  hard: boolean
  dryRun: boolean
}

async function uninstallApp(slug: string, options: UninstallOptions): Promise<void> {
  console.log(`\n🗑️  Uninstalling app '${slug}'...\n`)

  // 1. Find the app
  const { data: app, error: appErr } = await adminDb
    .from('apps')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (appErr || !app) {
    console.error(`  ❌ App '${slug}' not found in database`)
    process.exit(1)
  }

  const appId = app.id

  // 2. Deactivate types
  if (options.dryRun) {
    const { data: types } = await adminDb
      .from('types').select('slug').eq('app_id', appId).eq('is_active', true)
    console.log(`  [dry-run] Would deactivate ${types?.length || 0} types`)
  } else {
    const { data: updated } = await adminDb
      .from('types')
      .update({ is_active: false })
      .eq('app_id', appId)
      .eq('is_active', true)
      .select('id')

    console.log(`  ✓ Deactivated ${updated?.length || 0} types`)
  }

  // 3. Deactivate link types
  if (options.dryRun) {
    const { data: lt } = await adminDb
      .from('link_types').select('slug').eq('app_id', appId).eq('is_active', true)
    console.log(`  [dry-run] Would deactivate ${lt?.length || 0} link types`)
  } else {
    const { data: updated } = await adminDb
      .from('link_types')
      .update({ is_active: false })
      .eq('app_id', appId)
      .eq('is_active', true)
      .select('id')

    console.log(`  ✓ Deactivated ${updated?.length || 0} link types`)
  }

  // 4. Deactivate triggers
  if (options.dryRun) {
    const { data: triggers } = await adminDb
      .from('triggers').select('name').eq('app_id', appId).eq('is_active', true)
    console.log(`  [dry-run] Would deactivate ${triggers?.length || 0} triggers`)
  } else {
    const { data: updated } = await adminDb
      .from('triggers')
      .update({ is_active: false })
      .eq('app_id', appId)
      .eq('is_active', true)
      .select('id')

    console.log(`  ✓ Deactivated ${updated?.length || 0} triggers`)
  }

  // 5. Hard mode: deactivate items of this app's types
  if (options.hard) {
    if (options.dryRun) {
      const { data: types } = await adminDb
        .from('types').select('id').eq('app_id', appId)
      const typeIds = types?.map(t => t.id) || []
      if (typeIds.length > 0) {
        const { data: items } = await adminDb
          .from('items').select('id').in('type_id', typeIds).eq('is_active', true)
        console.log(`  [dry-run] Would deactivate ${items?.length || 0} items (--hard)`)
      }
    } else {
      const { data: types } = await adminDb
        .from('types').select('id').eq('app_id', appId)
      const typeIds = types?.map(t => t.id) || []

      if (typeIds.length > 0) {
        const { data: updated } = await adminDb
          .from('items')
          .update({ is_active: false })
          .in('type_id', typeIds)
          .eq('is_active', true)
          .select('id')

        console.log(`  ✓ Deactivated ${updated?.length || 0} items (--hard)`)
      }
    }
  }

  // 6. Mark installation as disabled
  if (!options.dryRun) {
    await adminDb
      .from('app_installations')
      .update({ is_enabled: false, updated_at: new Date().toISOString() })
      .eq('app_slug', slug)
  }

  // 7. Deactivate app record
  if (!options.dryRun) {
    await adminDb
      .from('apps')
      .update({ is_active: false })
      .eq('id', appId)

    console.log(`  ✓ App '${slug}' deactivated`)
  }

  console.log(`\n✅ App '${app.name}' uninstalled (soft-delete)`)
  if (!options.hard) {
    console.log(`   Items created by this app are preserved.`)
    console.log(`   Use --hard to also deactivate items.`)
  }
  console.log(`   App files remain in custom/apps/${slug}/ — delete manually if desired.`)
}

export function registerUninstallAppCommands(program: Command) {
  program
    .command('uninstall-app <slug>')
    .description('Soft-uninstall an app (deactivate types, triggers, link types)')
    .option('--hard', 'Also deactivate items created by this app', false)
    .option('--dry-run', 'Show what would happen without making changes', false)
    .action(async (slug, opts) => {
      try {
        await uninstallApp(slug, opts)
      } catch (err: any) {
        console.error('Error:', err.message)
        if (process.env.SPINE_CLI_DEBUG) console.error(err.stack)
        process.exit(1)
      }
    })
}
