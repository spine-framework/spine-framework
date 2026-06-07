/// <reference types="node" />
/**
 * @module cli/commands/publish
 * @audience developer
 * @layer cli
 * @stability stable
 *
 * `spine-framework publish` — Bump version, write changelog, publish to npm, commit.
 *
 * Run from the spine-ia coding repo. Handles both the framework package and
 * individual app packages (cortex, portal, etc.).
 *
 * **Usage:**
 * ```bash
 * spine-framework publish                          # publish framework (patch bump)
 * spine-framework publish --app cortex             # publish cortex app (patch bump)
 * spine-framework publish --app cortex --bump minor
 * spine-framework publish --app cortex --bump patch --notes "Fix sidebar nav"
 * spine-framework publish --app cortex --ci --notes "Fix sidebar nav" --bump patch
 * ```
 */

import type { Command } from 'commander'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import * as readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = process.cwd()

interface PublishOptions {
  app?: string
  bump: 'patch' | 'minor' | 'major'
  notes?: string
  ci: boolean
  dryRun: boolean
}

// ─── SEMVER BUMP ──────────────────────────────────────────────────────────────

function bumpVersion(current: string, bump: 'patch' | 'minor' | 'major'): string {
  const [major, minor, patch] = current.replace(/^v/, '').split('.').map(Number)
  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

// ─── INTERACTIVE PROMPT ───────────────────────────────────────────────────────

function promptNotes(): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question('  Changelog notes (comma-separated): ', answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// ─── PUBLISH LOGIC ────────────────────────────────────────────────────────────

async function publishTarget(options: PublishOptions): Promise<void> {
  const isApp = !!options.app
  const slug = options.app

  let pkgJsonPath: string
  let manifestPath: string | null
  let publishDir: string
  let displayName: string

  if (isApp && slug) {
    pkgJsonPath = resolve(PROJECT_ROOT, `custom/apps/${slug}/package.json`)
    manifestPath = resolve(PROJECT_ROOT, `custom/apps/${slug}/manifest.json`)
    publishDir = resolve(PROJECT_ROOT, `custom/apps/${slug}`)
    displayName = `spine-framework-${slug}`
  } else {
    pkgJsonPath = resolve(PROJECT_ROOT, 'package.json')
    manifestPath = null
    publishDir = PROJECT_ROOT
    displayName = 'spine-framework'
  }

  if (!existsSync(pkgJsonPath)) {
    console.error(`  ❌ package.json not found: ${pkgJsonPath}`)
    process.exit(1)
  }

  // 1. Read current version
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
  const currentVersion = pkgJson.version as string
  const newVersion = bumpVersion(currentVersion, options.bump)

  console.log(`\n📦 Publishing ${displayName}`)
  console.log(`   ${currentVersion} → ${newVersion} (${options.bump} bump)\n`)

  // 2. Collect changelog notes
  let notesInput = options.notes || ''
  if (!notesInput) {
    if (options.ci) {
      console.error(`  ❌ --ci mode requires --notes "..."`)
      process.exit(1)
    }
    notesInput = await promptNotes()
  }
  const notes = notesInput
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (notes.length === 0) {
    console.error(`  ❌ At least one changelog note is required.`)
    process.exit(1)
  }

  if (options.dryRun) {
    console.log(`  [dry-run] Would bump ${displayName} ${currentVersion} → ${newVersion}`)
    console.log(`  [dry-run] Changelog entry:`)
    console.log(`    { "version": "${newVersion}", "notes": ${JSON.stringify(notes)} }`)
    console.log(`  [dry-run] Would run: npm publish (from ${publishDir})`)
    console.log(`  [dry-run] Would commit: chore: publish ${displayName}@${newVersion}`)
    return
  }

  // 3. Bump version in package.json
  pkgJson.version = newVersion
  writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8')
  console.log(`  ✓ package.json version → ${newVersion}`)

  // 4. Prepend changelog entry to manifest.json (apps only)
  if (manifestPath && existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const changelog: Array<{ version: string; notes: string[] }> = manifest.changelog || []
    changelog.unshift({ version: newVersion, notes })
    manifest.version = newVersion
    manifest.changelog = changelog
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
    console.log(`  ✓ manifest.json changelog prepended, version → ${newVersion}`)
  }

  // 5. npm publish
  console.log(`\n🚀 Running npm publish...`)
  try {
    execSync('npm publish --access public', { cwd: publishDir, stdio: 'inherit' })
    console.log(`  ✓ Published ${displayName}@${newVersion}`)
  } catch (err: any) {
    console.error(`  ❌ npm publish failed: ${err.message}`)
    console.error(`     Version files have already been updated — commit them manually.`)
    process.exit(1)
  }

  // 6. Git commit
  console.log(`\n📝 Committing version bump...`)
  try {
    const filesToStage = [pkgJsonPath]
    if (manifestPath && existsSync(manifestPath)) filesToStage.push(manifestPath)
    execSync(`git add ${filesToStage.map(f => `"${f}"`).join(' ')}`, { cwd: PROJECT_ROOT })
    execSync(
      `git commit -m "chore: publish ${displayName}@${newVersion}"`,
      { cwd: PROJECT_ROOT, stdio: 'inherit' },
    )
    console.log(`  ✓ Committed`)
  } catch (err: any) {
    console.error(`  ⚠️  Git commit failed: ${err.message}`)
    console.error(`     Published successfully — commit the version files manually.`)
  }

  console.log(`\n✅ ${displayName}@${newVersion} published successfully!\n`)
}

export function registerPublishCommands(program: Command) {
  program
    .command('publish')
    .description('Bump version, write changelog, publish to npm, commit (run from spine-ia)')
    .option('--app <slug>', 'App slug to publish (e.g. cortex). Omit to publish the framework itself.')
    .option('--bump <level>', 'Version bump level: patch | minor | major', 'patch')
    .option('--notes <text>', 'Comma-separated changelog notes (required in --ci mode)')
    .option('--ci', 'Non-interactive mode: skip prompts, requires --notes', false)
    .option('--dry-run', 'Show what would happen without making changes', false)
    .action(async (opts) => {
      try {
        await publishTarget(opts as PublishOptions)
      } catch (err: any) {
        console.error('Error:', err.message)
        if (process.env.SPINE_CLI_DEBUG) console.error(err.stack)
        process.exit(1)
      }
    })
}
