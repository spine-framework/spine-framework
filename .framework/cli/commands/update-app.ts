/// <reference types="node" />
/**
 * @module cli/commands/update-app
 * @audience installer
 * @layer cli
 * @stability stable
 *
 * `spine-framework update-app <slug>` — Check for and assist with app updates.
 *
 * Design principle: the agentic IDE is the merge tool. This command never
 * writes to custom/apps/. It only:
 *   1. Gets the new version into node_modules/ (read-only upstream reference)
 *   2. Gives the agent a complete picture: versions, changelog, file diff summary
 *   3. Records the new version in DB once the agent signals it is done (--accept)
 *
 * **Usage:**
 * ```bash
 * spine-framework update-app cortex              # check for updates
 * spine-framework update-app cortex --dry-run    # full plan: changelog + file diff
 * spine-framework update-app cortex --accept     # record new version in DB only
 * ```
 */

import type { Command } from 'commander'
import { existsSync, readFileSync, readdirSync, createReadStream } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { adminDb } from '../../functions/_shared/index.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = process.cwd()

interface UpdateOptions {
  dryRun: boolean
  accept: boolean
}

interface InstallationRecord {
  app_slug: string
  is_enabled: boolean
  installed_version: string | null
  package_name: string | null
}

// ─── NPM REGISTRY ─────────────────────────────────────────────────────────────

async function fetchLatestVersion(packageName: string): Promise<string | null> {
  try {
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json() as { version?: string }
    return data.version || null
  } catch {
    return null
  }
}

// ─── SEMVER COMPARISON ────────────────────────────────────────────────────────

function parseSemver(v: string): [number, number, number] {
  const parts = v.replace(/^v/, '').split('.').map(Number)
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
}

function isNewer(candidate: string, current: string): boolean {
  const [cMaj, cMin, cPatch] = parseSemver(candidate)
  const [iMaj, iMin, iPatch] = parseSemver(current)
  if (cMaj !== iMaj) return cMaj > iMaj
  if (cMin !== iMin) return cMin > iMin
  return cPatch > iPatch
}

function changelogBetween(
  changelog: Array<{ version: string; notes: string[] }>,
  fromVersion: string,
  toVersion: string,
): Array<{ version: string; notes: string[] }> {
  return changelog.filter(entry => isNewer(entry.version, fromVersion) && !isNewer(entry.version, toVersion))
}

// ─── FILE DIFF SUMMARY ────────────────────────────────────────────────────────

function readFileSafe(filePath: string): string | null {
  try { return readFileSync(filePath, 'utf8') } catch { return null }
}

function diffAppFiles(
  pkgDir: string,
  localDir: string,
  dirs: string[],
  topFiles: string[],
): { changed: string[]; added: string[]; localOnly: string[] } {
  const changed: string[] = []
  const added: string[] = []
  const localOnly: string[] = []

  function diffFile(relPath: string) {
    const upstreamContent = readFileSafe(resolve(pkgDir, relPath))
    const localContent = readFileSafe(resolve(localDir, relPath))
    if (upstreamContent === null && localContent !== null) {
      localOnly.push(relPath)
    } else if (upstreamContent !== null && localContent === null) {
      added.push(relPath)
    } else if (upstreamContent !== null && localContent !== null && upstreamContent !== localContent) {
      changed.push(relPath)
    }
  }

  for (const file of topFiles) {
    diffFile(file)
  }

  for (const dir of dirs) {
    const upstreamDirPath = resolve(pkgDir, dir)
    if (!existsSync(upstreamDirPath)) continue
    const walkDir = (base: string, rel: string) => {
      const entries = readdirSync(resolve(base, rel), { withFileTypes: true })
      for (const entry of entries) {
        const entryRel = rel ? `${rel}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          walkDir(base, entryRel)
        } else {
          diffFile(`${dir}/${entryRel}`)
        }
      }
    }
    walkDir(upstreamDirPath, '')
  }

  return { changed, added, localOnly }
}

// ─── SEED HELPERS (reused from install-app logic) ─────────────────────────────

async function resolveAppId(slug: string): Promise<string | null> {
  const { data } = await adminDb.from('apps').select('id').eq('slug', slug).single()
  return data?.id || null
}

async function upsertSeedFile(
  appId: string,
  seedFile: string,
  records: any[],
): Promise<void> {
  const tableMap: Record<string, string> = {
    'types.json': 'types',
    'link-types.json': 'link_types',
    'roles.json': 'roles',
    'pipelines.json': 'pipelines',
  }
  const table = tableMap[seedFile]
  if (!table) return

  const conflictMap: Record<string, string> = {
    types: 'app_id,kind,slug',
    link_types: 'app_id,slug',
    roles: 'app_id,slug',
    pipelines: 'app_id,name',
  }

  for (const record of records) {
    await adminDb.from(table).upsert(
      { ...record, app_id: appId },
      { onConflict: conflictMap[table], ignoreDuplicates: false },
    )
  }
}

async function reapplySeed(slug: string, pkgDir: string): Promise<void> {
  const appId = await resolveAppId(slug)
  if (!appId) {
    console.log(`  ⚠️  App '${slug}' not found in DB — skipping seed re-apply`)
    return
  }

  const seedDir = resolve(pkgDir, 'seed')
  if (!existsSync(seedDir)) return

  const SEED_ORDER = ['accounts.json', 'types.json', 'link-types.json', 'roles.json', 'pipelines.json', 'triggers.json']
  const allFiles = readdirSync(seedDir).filter(f => f.endsWith('.json'))
  const seedFiles = [
    ...SEED_ORDER.filter(f => allFiles.includes(f)),
    ...allFiles.filter(f => !SEED_ORDER.includes(f)),
  ]

  for (const file of seedFiles) {
    try {
      const records = JSON.parse(readFileSync(resolve(seedDir, file), 'utf8'))
      if (Array.isArray(records)) {
        await upsertSeedFile(appId, file, records)
        console.log(`  ✓ Re-seeded ${file}`)
      }
    } catch { /* ignore parse errors */ }
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function updateApp(slug: string, options: UpdateOptions): Promise<void> {
  console.log(`\n🔄 Update check for '${slug}'...\n`)

  // 1. Read installation record from DB
  const { data: installation, error: dbErr } = await adminDb
    .from('app_installations')
    .select('app_slug, is_enabled, installed_version, package_name')
    .eq('app_slug', slug)
    .maybeSingle() as { data: InstallationRecord | null; error: any }

  if (dbErr) {
    console.error(`  ❌ DB error: ${dbErr.message}`)
    console.error(`     Has migration 004_app_version_tracking.sql been applied?`)
    process.exit(1)
  }

  if (!installation) {
    console.error(`  ❌ App '${slug}' is not installed (not found in app_installations).`)
    console.error(`     Run: spine-framework install-app spine-framework-${slug}`)
    process.exit(1)
  }

  const packageName = installation.package_name || `spine-framework-${slug}`
  const installedVersion = installation.installed_version

  if (!installedVersion) {
    console.log(`  ⚠️  No installed_version recorded. Re-install to track version:`)
    console.log(`     spine-framework install-app ${packageName} --force`)
    process.exit(1)
  }

  // 2. Fetch latest from npm registry
  process.stdout.write(`  Checking npm registry for ${packageName}... `)
  const latestVersion = await fetchLatestVersion(packageName)
  if (!latestVersion) {
    console.log(`❌`)
    console.error(`  Could not reach npm registry. Check your internet connection.`)
    process.exit(1)
  }
  console.log(`done`)

  console.log(`  Installed : v${installedVersion}`)
  console.log(`  Latest    : v${latestVersion}`)

  if (!isNewer(latestVersion, installedVersion)) {
    console.log(`\n✅ Already up to date.\n`)
    return
  }

  console.log(`  Status    : update available\n`)

  if (!options.dryRun && !options.accept) {
    console.log(`  Run with --dry-run to see changelog and file diff.`)
    console.log(`  Run with --accept after merging to record the new version.\n`)
    return
  }

  // ── --dry-run ──────────────────────────────────────────────────────────────
  if (options.dryRun) {
    console.log(`📥 Fetching ${packageName}@latest into node_modules (read-only reference)...`)
    try {
      execSync(`npm install ${packageName}@latest`, { cwd: PROJECT_ROOT, stdio: 'inherit' })
      console.log(`  ✓ Done\n`)
    } catch (err: any) {
      console.error(`  ❌ npm install failed: ${err.message}`)
      process.exit(1)
    }

    const pkgDir = resolve(PROJECT_ROOT, `node_modules/${packageName}`)
    const localDir = resolve(PROJECT_ROOT, `custom/apps/${slug}`)

    // Read changelog from new upstream version
    const upstreamManifestPath = resolve(pkgDir, 'manifest.json')
    let changelog: Array<{ version: string; notes: string[] }> = []
    let newVersion = latestVersion
    if (existsSync(upstreamManifestPath)) {
      try {
        const m = JSON.parse(readFileSync(upstreamManifestPath, 'utf8'))
        changelog = m.changelog || []
        newVersion = m.version || latestVersion
      } catch { /* ignore */ }
    }

    // Print changelog entries between installed and latest
    const relevantChangelog = changelogBetween(changelog, installedVersion, newVersion)
    console.log(`📋 Changelog (v${installedVersion} → v${newVersion}):`)
    if (relevantChangelog.length === 0) {
      console.log(`  (no changelog entries found between these versions)`)
    } else {
      for (const entry of relevantChangelog) {
        console.log(`\n  v${entry.version}:`)
        for (const note of entry.notes) {
          console.log(`    • ${note}`)
        }
      }
    }

    // Read directories list from upstream manifest
    let appDirs = ['pages', 'components', 'hooks', 'config', 'seed', 'api', 'functions', 'lib']
    try {
      const m = JSON.parse(readFileSync(upstreamManifestPath, 'utf8'))
      if (Array.isArray(m.directories)) appDirs = m.directories.filter((d: string) => d !== 'migrations' && d !== 'tests')
    } catch { /* use defaults */ }

    const topFiles = ['index.tsx', 'manifest.json']
    const diff = diffAppFiles(pkgDir, localDir, appDirs, topFiles)

    console.log(`\n📁 File diff summary (upstream vs your version):`)
    console.log(`   Upstream (new) : node_modules/${packageName}/`)
    console.log(`   Your version   : custom/apps/${slug}/\n`)

    if (diff.changed.length === 0 && diff.added.length === 0 && diff.localOnly.length === 0) {
      console.log(`  (no file differences detected)`)
    } else {
      if (diff.changed.length > 0) {
        console.log(`  Modified (${diff.changed.length}) — review and merge:`)
        diff.changed.forEach(f => console.log(`    ~ ${f}`))
      }
      if (diff.added.length > 0) {
        console.log(`\n  New in upstream (${diff.added.length}) — copy to your version:`)
        diff.added.forEach(f => console.log(`    + ${f}`))
      }
      if (diff.localOnly.length > 0) {
        console.log(`\n  Only in your version (${diff.localOnly.length}) — your additions, keep them:`)
        diff.localOnly.forEach(f => console.log(`    → ${f}`))
      }
    }

    console.log(`\n──────────────────────────────────────────────────────────────`)
    console.log(`  Next steps:`)
    console.log(`    1. Review and merge changed files listed above`)
    console.log(`    2. Run: spine-framework update-app ${slug} --accept`)
    console.log(`──────────────────────────────────────────────────────────────\n`)
    return
  }

  // ── --accept ──────────────────────────────────────────────────────────────
  if (options.accept) {
    console.log(`📝 Recording update...`)

    const pkgDir = resolve(PROJECT_ROOT, `node_modules/${packageName}`)
    if (!existsSync(pkgDir)) {
      console.error(`  ❌ ${packageName} not found in node_modules.`)
      console.error(`     Run --dry-run first to fetch the new version.`)
      process.exit(1)
    }

    // Read new version from upstream manifest
    let newVersion = latestVersion
    const upstreamManifestPath = resolve(pkgDir, 'manifest.json')
    if (existsSync(upstreamManifestPath)) {
      try {
        newVersion = JSON.parse(readFileSync(upstreamManifestPath, 'utf8')).version || latestVersion
      } catch { /* use latestVersion */ }
    }

    const { error: updateErr } = await adminDb
      .from('app_installations')
      .update({
        installed_version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('app_slug', slug)

    if (updateErr) {
      console.error(`  ❌ Failed to update installed_version: ${updateErr.message}`)
      process.exit(1)
    }

    console.log(`  ✓ installed_version updated to v${newVersion}`)

    // Re-apply seed (idempotent)
    console.log(`\n🌱 Re-applying seed data (idempotent)...`)
    await reapplySeed(slug, pkgDir)

    console.log(`\n✅ Update recorded for '${slug}' → v${newVersion}`)
    console.log(`   Run 'spine-framework status' to verify.\n`)
  }
}

export function registerUpdateAppCommands(program: Command) {
  program
    .command('update-app <slug>')
    .description('Check for app updates and assist with agentic-IDE-driven merge')
    .option('--dry-run', 'Fetch latest, show changelog + file diff (no writes to custom/apps/)', false)
    .option('--accept', 'Record new version in DB after agent has merged files', false)
    .action(async (slug, opts) => {
      try {
        await updateApp(slug, opts)
      } catch (err: any) {
        console.error('Error:', err.message)
        if (process.env.SPINE_CLI_DEBUG) console.error(err.stack)
        process.exit(1)
      }
    })
}
