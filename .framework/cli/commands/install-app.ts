/// <reference types="node" />
/**
 * @module cli/commands/install-app
 * @audience installer
 * @layer cli
 * @stability stable
 *
 * `spine-framework install-app <slug>` — Install an app into the current Spine instance.
 *
 * Reads seed/*.json files from the app package directory and upserts their
 * contents into the database. Also registers the app in `app_installations`.
 *
 * **Seed file conventions:**
 * - `types.json` → upsert into `types` table
 * - `link-types.json` → upsert into `link_types` table
 * - `triggers.json` → upsert into `triggers` table
 * - `accounts.json` → upsert into `accounts` table
 * - `pipelines.json` → upsert into `pipelines` table
 *
 * All upserts keyed on `(app_id, slug)` — idempotent and safe to re-run.
 *
 * **Usage:**
 * ```bash
 * spine-framework install-app cortex
 * spine-framework install-app customer-portal
 * spine-framework install-app cortex --account <account-id>
 * ```
 */

import type { Command } from 'commander'
import { existsSync, readFileSync, readdirSync, cpSync, mkdirSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { adminDb } from '../../functions/_shared/index.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = process.cwd()

interface InstallOptions {
  account?: string
  force: boolean
  dryRun: boolean
  packageName?: string
}

interface SeedResult {
  table: string
  inserted: number
  skipped: number
  errors: string[]
}

async function resolveAppId(slug: string): Promise<string | null> {
  const { data } = await adminDb
    .from('apps')
    .select('id')
    .eq('slug', slug)
    .single()

  return data?.id || null
}

async function resolveSystemAccountId(): Promise<string | null> {
  const { data } = await adminDb
    .from('accounts')
    .select('id')
    .eq('slug', 'spine-system')
    .maybeSingle()
  return data?.id || null
}

async function ensureAppRecord(slug: string, name: string): Promise<string> {
  let appId = await resolveAppId(slug)

  if (!appId) {
    const ownerAccountId = await resolveSystemAccountId()
    const { error: insertErr, data } = await adminDb
      .from('apps')
      .insert({
        slug,
        name,
        route_prefix: `/${slug}`,
        renderer: 'custom',
        is_active: true,
        is_system: false,
        owner_account_id: ownerAccountId,
      })
      .select('id')
      .single()

    if (insertErr) {
      throw new Error(`Failed to create app record: ${insertErr.message}`)
    }
    appId = data.id
    console.log(`  ✓ Created app record for '${slug}'`)
  } else {
    console.log(`  ⏭️  App '${slug}' already in database`)
  }

  return appId!
}

async function upsertTypes(appId: string, records: any[], dryRun: boolean): Promise<SeedResult> {
  const result: SeedResult = { table: 'types', inserted: 0, skipped: 0, errors: [] }

  for (const record of records) {
    if (dryRun) {
      console.log(`    [dry-run] Would upsert type: ${record.slug}`)
      result.inserted++
      continue
    }

    const { error } = await adminDb
      .from('types')
      .upsert({
        ...record,
        app_id: appId,
      }, {
        onConflict: 'app_id,kind,slug',
        ignoreDuplicates: false
      })

    if (error) {
      result.errors.push(`${record.slug}: ${error.message}`)
    } else {
      result.inserted++
    }
  }

  return result
}

async function upsertLinkTypes(appId: string, records: any[], dryRun: boolean): Promise<SeedResult> {
  const result: SeedResult = { table: 'link_types', inserted: 0, skipped: 0, errors: [] }

  for (const record of records) {
    if (dryRun) {
      console.log(`    [dry-run] Would upsert link type: ${record.slug}`)
      result.inserted++
      continue
    }

    const { error } = await adminDb
      .from('link_types')
      .upsert({
        ...record,
        app_id: appId,
      }, {
        onConflict: 'app_id,slug',
        ignoreDuplicates: false
      })

    if (error) {
      result.errors.push(`${record.slug}: ${error.message}`)
    } else {
      result.inserted++
    }
  }

  return result
}

async function upsertTriggers(appId: string, records: any[], dryRun: boolean): Promise<SeedResult> {
  const result: SeedResult = { table: 'triggers', inserted: 0, skipped: 0, errors: [] }

  for (const record of records) {
    if (dryRun) {
      console.log(`    [dry-run] Would upsert trigger: ${record.name}`)
      result.inserted++
      continue
    }

    // Clone config to avoid mutating the original
    const config = record.config ? JSON.parse(JSON.stringify(record.config)) : {}

    // Resolve type_slug references in filters to type_id
    if (config.filters && Array.isArray(config.filters)) {
      for (const filter of config.filters) {
        if (filter.type_slug && !filter.value) {
          const { data: typeData, error: typeError } = await adminDb
            .from('types')
            .select('id')
            .eq('slug', filter.type_slug)
            .eq('app_id', appId)
            .single()

          if (typeError || !typeData) {
            result.errors.push(`${record.name}: type_slug '${filter.type_slug}' not found`)
            continue
          }

          filter.value = typeData.id
          delete filter.type_slug
        }
      }
    }

    const { error } = await adminDb
      .from('triggers')
      .upsert({
        ...record,
        app_id: appId,
        config,
      }, {
        onConflict: 'app_id,name',
        ignoreDuplicates: false
      })

    if (error) {
      result.errors.push(`${record.name}: ${error.message}`)
    } else {
      result.inserted++
    }
  }

  return result
}

async function upsertAccounts(appId: string, records: any[], dryRun: boolean): Promise<SeedResult> {
  const result: SeedResult = { table: 'accounts', inserted: 0, skipped: 0, errors: [] }

  for (const record of records) {
    if (dryRun) {
      console.log(`    [dry-run] Would upsert account: ${record.slug}`)
      result.inserted++
      continue
    }

    // Resolve type_slug → type_id if present
    const row = { ...record, app_id: appId }
    if (row.type_slug && !row.type_id) {
      const { data: typeData } = await adminDb
        .from('types')
        .select('id')
        .eq('kind', 'account')
        .eq('slug', row.type_slug)
        .limit(1)
        .single()
      if (typeData) {
        row.type_id = typeData.id
      } else {
        result.errors.push(`${record.slug}: type_slug '${row.type_slug}' not found`)
        continue
      }
      delete row.type_slug
    }

    const { error } = await adminDb
      .from('accounts')
      .upsert(row, {
        onConflict: 'slug',
        ignoreDuplicates: false
      })

    if (error) {
      result.errors.push(`${record.slug}: ${error.message}`)
    } else {
      result.inserted++
    }
  }

  return result
}

async function upsertPipelines(appId: string, records: any[], dryRun: boolean): Promise<SeedResult> {
  const result: SeedResult = { table: 'pipelines', inserted: 0, skipped: 0, errors: [] }

  for (const record of records) {
    if (dryRun) {
      console.log(`    [dry-run] Would upsert pipeline: ${record.slug}`)
      result.inserted++
      continue
    }

    const { error } = await adminDb
      .from('pipelines')
      .upsert({
        ...record,
        app_id: appId,
      }, {
        onConflict: 'app_id,name',
        ignoreDuplicates: false
      })

    if (error) {
      result.errors.push(`${record.slug}: ${error.message}`)
    } else {
      result.inserted++
    }
  }

  return result
}

async function upsertRoles(appId: string, records: any[], dryRun: boolean): Promise<SeedResult> {
  const result: SeedResult = { table: 'roles', inserted: 0, skipped: 0, errors: [] }

  for (const record of records) {
    if (dryRun) {
      console.log(`    [dry-run] Would upsert role: ${record.slug}`)
      result.inserted++
      continue
    }

    const { error } = await adminDb
      .from('roles')
      .upsert({
        ...record,
        app_id: appId,
      }, {
        onConflict: 'app_id,slug',
        ignoreDuplicates: false
      })

    if (error) {
      result.errors.push(`${record.slug}: ${error.message}`)
    } else {
      result.inserted++
    }
  }

  return result
}

const SEED_HANDLERS: Record<string, (appId: string, records: any[], dryRun: boolean) => Promise<SeedResult>> = {
  'types.json': upsertTypes,
  'link-types.json': upsertLinkTypes,
  'triggers.json': upsertTriggers,
  'accounts.json': upsertAccounts,
  'pipelines.json': upsertPipelines,
  'roles.json': upsertRoles,
}

async function recordInstallation(
  appSlug: string,
  accountId: string | null,
  dryRun: boolean,
  installedVersion?: string,
  packageName?: string,
): Promise<void> {
  if (dryRun) {
    console.log(`  [dry-run] Would record installation for '${appSlug}' (version: ${installedVersion || 'unknown'})`)
    return
  }

  const { error } = await adminDb
    .from('app_installations')
    .upsert({
      app_slug: appSlug,
      account_id: accountId,
      is_enabled: true,
      installed_version: installedVersion || null,
      package_name: packageName || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'app_slug,account_id',
    })

  if (error) {
    console.log(`  ⚠️  Failed to record installation: ${error.message}`)
  }
}

function isNpmPackage(slug: string): boolean {
  return slug.includes('/') || slug.startsWith('spine-framework-') || slug.startsWith('@')
}

function resolveSlugFromPackage(pkg: string): string {
  const manifest = resolve(PROJECT_ROOT, `node_modules/${pkg}/spine-manifest.json`)
  if (existsSync(manifest)) {
    try {
      return JSON.parse(readFileSync(manifest, 'utf8')).slug
    } catch { /* fall through */ }
  }
  const pkgJson = resolve(PROJECT_ROOT, `node_modules/${pkg}/package.json`)
  if (existsSync(pkgJson)) {
    try {
      const meta = JSON.parse(readFileSync(pkgJson, 'utf8'))
      if (meta.spine?.slug) return meta.spine.slug
    } catch { /* fall through */ }
  }
  return pkg.replace(/^spine-framework-/, '').replace(/^@[^/]+\//, '')
}

async function checkPrerequisites(_slug: string): Promise<void> {
  // Apps are independently installable — no hardcoded prereqs.
  // Future: read prereqs from the app's manifest.json if needed.
}

function copyAppFiles(pkg: string, slug: string, force: boolean): void {
  const pkgDir = resolve(PROJECT_ROOT, `node_modules/${pkg}`)
  const targetAppDir = resolve(PROJECT_ROOT, `custom/apps/${slug}`)

  // Guard: abort if already installed and --force not passed
  if (existsSync(targetAppDir) && statSync(targetAppDir).isDirectory()) {
    const hasFiles = readdirSync(targetAppDir).length > 0
    if (hasFiles && !force) {
      console.error(`  ❌ App '${slug}' is already installed at custom/apps/${slug}/`)
      console.error(`     Use 'update-app ${slug}' to upgrade, or 'install-app --force' to overwrite.`)
      process.exit(1)
    }
    if (hasFiles && force) {
      console.log(`  ⚠️  --force: overwriting existing custom/apps/${slug}/`)
    }
  }

  mkdirSync(targetAppDir, { recursive: true })

  // Always copy core app files
  const appFiles = ['index.tsx', 'manifest.json', 'package.json']
  for (const file of appFiles) {
    const src = resolve(pkgDir, file)
    if (existsSync(src)) {
      cpSync(src, resolve(targetAppDir, file), { force: true })
    }
  }

  // Read directories from manifest (self-contained apps)
  const manifestPath = resolve(pkgDir, 'manifest.json')
  let appDirs = ['pages', 'components', 'hooks', 'config', 'seed', 'api', 'functions', 'migrations', 'tests']
  
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      if (manifest.directories && Array.isArray(manifest.directories)) {
        appDirs = manifest.directories
      }
    } catch (e) {
      console.warn(`  ⚠️  Could not read manifest.json, using default directories`)
    }
  }

  // Copy app directories (all self-contained within the app)
  for (const dir of appDirs) {
    const src = resolve(pkgDir, dir)
    if (existsSync(src)) {
      cpSync(src, resolve(targetAppDir, dir), { recursive: true, force: true })
      console.log(`  ✓ Copied ${dir}/ → custom/apps/${slug}/${dir}/`)
    }
  }

  console.log(`  ✓ Ejected app files → custom/apps/${slug}/`)
}

async function installApp(slug: string, options: InstallOptions): Promise<void> {
  console.log(`\n📦 Installing app '${slug}'...\n`)

  let resolvedSlug = slug
  let packageName: string | null = null

  if (isNpmPackage(slug)) {
    // Strip version specifier (e.g. spine-framework-cortex@latest → spine-framework-cortex)
    // Handles: pkg@latest, pkg@1.2.3, @scope/pkg@latest (preserve leading @ for scoped packages)
    const barePackageName = slug.startsWith('@')
      ? slug.replace(/(@[^/]+\/[^@]+)@.*$/, '$1')   // @scope/pkg@version → @scope/pkg
      : slug.replace(/@.*$/, '')                      // pkg@version → pkg
    packageName = barePackageName
    console.log(`📥 Step 1: Installing npm package...`)
    const pkgDir = resolve(PROJECT_ROOT, `node_modules/${barePackageName}`)
    // Always run npm install when a version specifier is given (e.g. @1.2.3 or @latest)
    // so the correct version is fetched even if an older one is already in node_modules.
    const hasVersionSpec = slug.includes('@') && !slug.startsWith('@') || (slug.startsWith('@') && slug.split('@').length > 2)
    const shouldInstall = !existsSync(pkgDir) || hasVersionSpec
    if (shouldInstall) {
      try {
        console.log(`  Running: npm install ${slug}`)
        execSync(`npm install ${slug}`, { cwd: PROJECT_ROOT, stdio: 'inherit' })
        console.log(`  ✓ Package installed`)
      } catch (err: any) {
        console.error(`  ❌ npm install failed: ${err.message}`)
        process.exit(1)
      }
    } else {
      console.log(`  ⏭️  Package already in node_modules`)
    }
    resolvedSlug = resolveSlugFromPackage(barePackageName)
    console.log(`  ✓ App slug: ${resolvedSlug}`)

    console.log(`\n📁 Step 2: Ejecting app files...`)
    copyAppFiles(barePackageName, resolvedSlug, options.force)
  }

  // Check prerequisites (e.g. portal requires cortex)
  await checkPrerequisites(resolvedSlug)

  const appDir = resolve(PROJECT_ROOT, `custom/apps/${resolvedSlug}`)
  if (!existsSync(appDir)) {
    console.error(`  ❌ App directory not found: custom/apps/${resolvedSlug}`)
    console.error(`     Install the npm package first or create the app with 'spine-framework create-app ${resolvedSlug}'`)
    process.exit(1)
  }

  // 2. Read manifest for display name
  const manifestPath = resolve(appDir, 'manifest.json')
  let appName = slug
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      appName = manifest.name || slug
      console.log(`  📋 Manifest: ${appName} v${manifest.version || '0.0.0'}`)
    } catch {
      console.log(`  ⚠️  Could not parse manifest.json, using slug as name`)
    }
  } else {
    console.log(`  ⚠️  No manifest.json found, using slug as name`)
  }

  // 3. Ensure app record in DB
  const appId = await ensureAppRecord(resolvedSlug, appName)

  // 4. Process seed files
  const seedDir = resolve(appDir, 'seed')
  if (!existsSync(seedDir)) {
    console.log(`  ⏭️  No seed/ directory — skipping data seeding`)
  } else {
    console.log(`\n🌱 Applying seed data...`)
    const SEED_ORDER = ['accounts.json', 'types.json', 'link-types.json', 'roles.json', 'pipelines.json', 'triggers.json']
    const allFiles = readdirSync(seedDir).filter(f => f.endsWith('.json'))
    const seedFiles = [
      ...SEED_ORDER.filter(f => allFiles.includes(f)),
      ...allFiles.filter(f => !SEED_ORDER.includes(f)),
    ]

    let totalInserted = 0
    let totalErrors = 0

    for (const file of seedFiles) {
      const handler = SEED_HANDLERS[file]
      if (!handler) {
        console.log(`  ⏭️  Skipping unknown seed file: ${file}`)
        continue
      }

      const filePath = resolve(seedDir, file)
      let records: any[]
      try {
        records = JSON.parse(readFileSync(filePath, 'utf8'))
        if (!Array.isArray(records)) {
          console.log(`  ⚠️  ${file}: expected array, skipping`)
          continue
        }
      } catch (err: any) {
        console.error(`  ❌ ${file}: parse error — ${err.message}`)
        continue
      }

      console.log(`  📄 ${file} (${records.length} records)...`)
      const result = await handler(appId, records, options.dryRun)

      if (result.errors.length > 0) {
        for (const e of result.errors) {
          console.error(`    ❌ ${e}`)
        }
        totalErrors += result.errors.length
      }
      totalInserted += result.inserted
      console.log(`    ✓ ${result.inserted} upserted`)
    }

    console.log(`\n  Total: ${totalInserted} records upserted, ${totalErrors} errors`)
  }

  // 5. Record installation
  console.log(`\n📝 Recording installation...`)
  let installedVersion: string | undefined
  const manifestForVersion = resolve(appDir, 'manifest.json')
  if (existsSync(manifestForVersion)) {
    try {
      installedVersion = JSON.parse(readFileSync(manifestForVersion, 'utf8')).version
    } catch { /* ignore */ }
  }
  await recordInstallation(resolvedSlug, options.account || null, options.dryRun, installedVersion, packageName || undefined)

  console.log(`\n✅ App '${appName}' installed successfully!`)
  console.log(`\n   Next steps:`)
  console.log(`   1. npm run assemble && netlify dev`)
  console.log(`   2. Navigate to /${resolvedSlug} in your browser`)
}

export function registerInstallAppCommands(program: Command) {
  program
    .command('install-app <slug>')
    .description('Install an app by applying its seed data to the database')
    .option('--account <id>', 'Account ID to associate the installation with')
    .option('--force', 'Overwrite existing seed data', false)
    .option('--dry-run', 'Show what would happen without making changes', false)
    .action(async (slug, opts) => {
      try {
        await installApp(slug, opts)
      } catch (err: any) {
        console.error('Error:', err.message)
        if (process.env.SPINE_CLI_DEBUG) console.error(err.stack)
        process.exit(1)
      }
    })
}
