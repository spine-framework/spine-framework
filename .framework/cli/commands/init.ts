/// <reference types="node" />
/**
 * @module cli/commands/init
 * @audience installer
 * @layer cli
 * @stability stable
 *
 * `spine-framework init` — Write .env and scaffold the custom/ workspace.
 *
 * Intentionally does NOT touch the database — run `spine-framework migrate`
 * after init to apply SQL migrations via a direct Postgres connection.
 *
 * **Usage:**
 * ```bash
 * spine-framework init --url https://xyz.supabase.co --anon-key eyJ... --service-role-key eyJ...
 * spine-framework migrate --db-password <password>
 * ```
 */

import type { Command } from 'commander'
import { existsSync, mkdirSync, writeFileSync, cpSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = process.cwd()
// Package root: node_modules/spine-framework/ — 3 levels up from .framework/cli/commands/
const PACKAGE_ROOT = resolve(__dirname, '../../..')

interface InitOptions {
  dryRun: boolean
}

function scaffoldCustomWorkspace(dryRun: boolean): void {
  const dirs = [
    'custom/apps',
    'custom/functions',
    'custom/components',
    'custom/migrations',
    'custom/tests',
  ]

  for (const dir of dirs) {
    const fullPath = resolve(PROJECT_ROOT, dir)
    if (existsSync(fullPath)) {
      console.log(`  ⏭️  ${dir}/ already exists`)
    } else if (dryRun) {
      console.log(`  [dry-run] Would create: ${dir}/`)
    } else {
      mkdirSync(fullPath, { recursive: true })
      writeFileSync(resolve(fullPath, '.gitkeep'), '')
      console.log(`  ✓ Created ${dir}/`)
    }
  }
}

function writeEnvFile(dryRun: boolean): void {
  const envPath = resolve(PROJECT_ROOT, '.env')

  if (existsSync(envPath)) {
    console.log('  ⏭️  .env already exists, skipping')
    return
  }

  const envContent = [
    '# ─── Supabase ────────────────────────────────────────────────────────────────',
    '# Get these from: https://supabase.com/dashboard/project/_/settings/api',
    'SUPABASE_URL=https://your-project.supabase.co',
    'SUPABASE_ANON_KEY=your-anon-key',
    'SUPABASE_SERVICE_ROLE_KEY=your-service-role-key',
    '',
    '# DB password for running migrations (direct Postgres connection)',
    '# Get from: https://supabase.com/dashboard/project/_/settings/database',
    'SUPABASE_DB_PASSWORD=your-db-password',
    '',
    '# ─── Vite / Frontend ─────────────────────────────────────────────────────────',
    'VITE_SUPABASE_URL=https://your-project.supabase.co',
    'VITE_SUPABASE_ANON_KEY=your-anon-key',
    'VITE_APP_NAME=Spine',
    '',
    '# ─── OpenAI ──────────────────────────────────────────────────────────────────',
    'OPENAI_API_KEY=your-openai-api-key',
    '',
    '# ─── App config ──────────────────────────────────────────────────────────────',
    'DB_SCHEMA=public',
  ].join('\n') + '\n'

  if (dryRun) {
    console.log('  [dry-run] Would write .env with placeholder values')
    return
  }

  writeFileSync(envPath, envContent, 'utf8')
  console.log('  ✓ Created .env')
}

function copyFrameworkFiles(dryRun: boolean): void {
  // Directories and files to copy from the package root into the consumer project root
  const items = [
    { src: '.framework',     dest: '.framework'     },
    { src: 'bin',            dest: 'bin'            },
    { src: 'config',         dest: 'config'         },
    { src: 'scripts',        dest: 'scripts'        },
    { src: 'netlify.toml',   dest: 'netlify.toml'   },
    { src: 'vitest.config.ts', dest: 'vitest.config.ts' },
    { src: 'index.html',     dest: 'index.html'     },
    { src: 'package-project.json', dest: 'package.json' },
    { src: 'STRUCTURE.md',   dest: 'STRUCTURE.md'   },
  ]

  for (const item of items) {
    const src  = resolve(PACKAGE_ROOT, item.src)
    const dest = resolve(PROJECT_ROOT, item.dest)

    if (!existsSync(src)) {
      console.log(`  ⏭️  ${item.src} not found in package, skipping`)
      continue
    }

    // Always overwrite package.json (npm creates a minimal one during install)
    if (existsSync(dest) && item.dest !== 'package.json') {
      console.log(`  ⏭️  ${item.dest} already exists, skipping`)
      continue
    }

    if (dryRun) {
      console.log(`  [dry-run] Would copy: ${item.src} → ./${item.dest}`)
      continue
    }

    cpSync(src, dest, { recursive: true })
    console.log(`  ✓ Copied ${item.dest}`)
  }
}

async function initCommand(options: InitOptions): Promise<void> {
  console.log('\n🚀 Spine Framework — Init\n')

  // Step 1: Copy framework files to project root
  console.log('📦 Step 1: Installing framework files...')
  copyFrameworkFiles(options.dryRun)

  // Step 2: Install dev dependencies (vite, netlify-cli)
  if (!options.dryRun) {
    console.log('\n📦 Step 2: Installing dev dependencies...')
    try {
      execSync('npm install', { stdio: 'inherit', cwd: PROJECT_ROOT })
      console.log('  ✓ Dev dependencies installed')
    } catch (err) {
      console.log('  ⚠️  npm install failed — run manually: npm install')
    }
  }

  // Step 3: Scaffold custom workspace
  console.log('\n📁 Step 3: Scaffolding custom workspace...')
  scaffoldCustomWorkspace(options.dryRun)

  // Step 4: Write .env with placeholders
  console.log('\n🔑 Step 4: Writing environment configuration...')
  writeEnvFile(options.dryRun)

  console.log('\n✅ Project initialized!')
  console.log('\n   Next steps:')
  console.log('   1. Fill in your Supabase credentials in .env')
  console.log('      (get them from https://supabase.com/dashboard/project/_/settings/api)')
  console.log('   2. Run: npx spine-framework migrate')
  console.log('      (ensure SUPABASE_DB_PASSWORD is set in .env)')
}

export function registerInitCommands(program: Command) {
  program
    .command('init')
    .description('Install framework files, scaffold custom/ workspace, and write .env template')
    .option('--dry-run', 'Show what would happen without making changes', false)
    .action(async (opts) => {
      try {
        await initCommand(opts)
      } catch (err: any) {
        console.error('Error:', err.message)
        if (process.env.SPINE_CLI_DEBUG) console.error(err.stack)
        process.exit(1)
      }
    })
}
