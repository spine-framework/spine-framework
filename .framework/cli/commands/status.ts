/// <reference types="node" />
/**
 * @module cli/commands/status
 * @audience installer
 * @layer cli
 * @stability stable
 *
 * `spine-framework status` — Show the current state of the Spine installation.
 *
 * Displays:
 * - Database connection status
 * - Installed apps and their seed state
 * - Migration history
 * - Webhook handler registrations
 *
 * **Usage:**
 * ```bash
 * spine-framework status
 * spine-framework status --json
 * ```
 */

import type { Command } from 'commander'
import { existsSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { adminDb } from '../../functions/_shared/index.ts'
import { discoverManifests } from '../../functions/_shared/app-manifest.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = resolve(__dirname, '../../../')

interface StatusOptions {
  json: boolean
}

interface StatusReport {
  database: { connected: boolean; error?: string }
  apps: Array<{
    slug: string
    name: string
    hasManifest: boolean
    hasSeed: boolean
    installed: boolean
    installedVersion: string | null
    packageName: string | null
  }>
  webhookHandlers: Array<{ name: string; functionName: string; isActive: boolean }>
  typeCounts: { total: number; byApp: Record<string, number> }
}

async function gatherStatus(): Promise<StatusReport> {
  const report: StatusReport = {
    database: { connected: false },
    apps: [],
    webhookHandlers: [],
    typeCounts: { total: 0, byApp: {} },
  }

  // 1. Database connection
  try {
    const { data, error } = await adminDb
      .from('apps')
      .select('slug')
      .limit(1)

    if (error) {
      report.database = { connected: false, error: error.message }
    } else {
      report.database = { connected: true }
    }
  } catch (err: any) {
    report.database = { connected: false, error: err.message }
    return report
  }

  // 2. Apps — merge filesystem + database
  const manifests = discoverManifests()
  const { data: dbApps } = await adminDb
    .from('apps')
    .select('slug, name, is_active')
    .eq('is_active', true)
    .order('slug')

  const { data: installations } = await adminDb
    .from('app_installations')
    .select('app_slug, is_enabled, installed_version, package_name')

  const installedSlugs = new Set(
    (installations || []).filter(i => i.is_enabled).map(i => i.app_slug)
  )

  const installationMap = new Map(
    (installations || []).map(i => [i.app_slug, i])
  )

  const allSlugs = new Set([
    ...manifests.map(m => m.slug),
    ...(dbApps || []).map(a => a.slug).filter(s => s !== 'spine-core'),
  ])

  for (const slug of allSlugs) {
    const manifest = manifests.find(m => m.slug === slug)
    const dbApp = dbApps?.find(a => a.slug === slug)
    const seedDir = resolve(PROJECT_ROOT, `custom/apps/${slug}/seed`)

    const installation = installationMap.get(slug)
    report.apps.push({
      slug,
      name: dbApp?.name || slug,
      hasManifest: !!manifest,
      hasSeed: existsSync(seedDir) && readdirSync(seedDir).some(f => f.endsWith('.json')),
      installed: installedSlugs.has(slug),
      installedVersion: installation?.installed_version || null,
      packageName: installation?.package_name || null,
    })
  }

  // 3. Webhook handlers
  const { data: handlers } = await adminDb
    .from('webhook_handlers')
    .select('name, function_name, is_active')
    .order('name')

  report.webhookHandlers = (handlers || []).map(h => ({
    name: h.name,
    functionName: h.function_name,
    isActive: h.is_active,
  }))

  // 4. Type counts by app
  const { data: types } = await adminDb
    .from('types')
    .select('slug, app_id, apps!inner(slug)')
    .eq('is_active', true)

  report.typeCounts.total = types?.length || 0
  for (const t of types || []) {
    const appSlug = (t as any).apps?.slug || 'unassigned'
    report.typeCounts.byApp[appSlug] = (report.typeCounts.byApp[appSlug] || 0) + 1
  }

  return report
}

function printStatus(report: StatusReport): void {
  console.log('\n🔍 Spine Framework Status\n')

  // Database
  if (report.database.connected) {
    console.log('  📡 Database: ✅ Connected')
  } else {
    console.log(`  📡 Database: ❌ ${report.database.error || 'Not connected'}`)
    return
  }

  // Apps
  console.log(`\n  📱 Apps (${report.apps.length}):`)
  if (report.apps.length === 0) {
    console.log('     (none)')
  } else {
    for (const app of report.apps) {
      const versionStr = app.installedVersion ? `v${app.installedVersion}` : ''
      const status = [
        app.hasManifest ? '📋 manifest' : '',
        app.hasSeed ? '🌱 seed' : '',
        app.installed ? `✅ installed${versionStr ? ' ' + versionStr : ''}` : '⬜ not installed',
      ].filter(Boolean).join('  ')
      console.log(`     ${app.slug.padEnd(24)} ${status}`)
    }
  }

  // Webhook handlers
  console.log(`\n  🔗 Webhook Handlers (${report.webhookHandlers.length}):`)
  if (report.webhookHandlers.length === 0) {
    console.log('     (none)')
  } else {
    for (const h of report.webhookHandlers) {
      const status = h.isActive ? '✅' : '❌'
      console.log(`     ${status} ${h.name.padEnd(24)} → ${h.functionName}`)
    }
  }

  // Types
  console.log(`\n  📊 Types (${report.typeCounts.total} total):`)
  for (const [app, count] of Object.entries(report.typeCounts.byApp).sort()) {
    console.log(`     ${app.padEnd(24)} ${count} types`)
  }

  console.log('')
}

export function registerStatusCommands(program: Command) {
  program
    .command('status')
    .description('Show the current state of the Spine installation')
    .option('--json', 'Output as JSON', false)
    .action(async (opts: StatusOptions) => {
      try {
        const report = await gatherStatus()
        if (opts.json) {
          console.log(JSON.stringify(report, null, 2))
        } else {
          printStatus(report)
        }
      } catch (err: any) {
        console.error('Error:', err.message)
        if (process.env.SPINE_CLI_DEBUG) console.error(err.stack)
        process.exit(1)
      }
    })
}
