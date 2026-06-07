/// <reference types="node" />
/**
 * @module cli/commands/migrate
 * @audience installer
 * @layer cli
 * @stability stable
 *
 * `spine-framework migrate` — Apply SQL migrations to a Supabase project
 * via a direct Postgres connection.
 *
 * Requires --db-password (the Supabase database password).
 * Get it from: https://supabase.com/dashboard/project/_/settings/database
 *
 * **Usage:**
 * ```bash
 * spine-framework migrate --db-password <password>
 * spine-framework migrate --db-password <password> --dry-run
 * ```
 */

import type { Command } from 'commander'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MIGRATIONS_DIR = resolve(__dirname, '../../migrations')

interface MigrateOptions {
  dbPassword?: string
  dryRun: boolean
}

async function migrateCommand(options: MigrateOptions): Promise<void> {
  console.log('\n🗄️  Spine Framework — Migrate\n')

  const supabaseUrl = process.env.SUPABASE_URL
  if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
    console.error('❌ SUPABASE_URL not set. Fill in your .env file first.')
    process.exit(1)
  }

  const dbPassword = options.dbPassword || process.env.SUPABASE_DB_PASSWORD
  if (!dbPassword || dbPassword === 'your-db-password') {
    console.error('❌ SUPABASE_DB_PASSWORD not set.')
    console.error('   Add it to .env or pass --db-password <password>')
    console.error('   Get it from: https://supabase.com/dashboard/project/_/settings/database')
    process.exit(1)
  }

  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
  const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`

  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`)
    process.exit(1)
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.log('  No migration files found.')
    return
  }

  console.log(`  Found ${files.length} migration file(s)\n`)

  if (options.dryRun) {
    for (const file of files) {
      console.log(`  [dry-run] Would apply: ${file}`)
    }
    return
  }

  // Dynamically import pg to avoid loading it at module init time
  const { default: pg } = await import('pg')
  const client = new pg.Client({ connectionString })

  try {
    await client.connect()
    console.log('  ✓ Connected to database\n')
  } catch (err: any) {
    console.error(`❌ Could not connect to database: ${err.message}`)
    console.error('   Check your --db-password and that the project is active.')
    process.exit(1)
  }

  let applied = 0
  let failed = 0

  for (const file of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8')
    process.stdout.write(`  Applying ${file}... `)

    // Split into individual statements so each executes in its own round-trip.
    // Running the whole file as one query string causes pg to abort the entire
    // batch on the first error, preventing PL/pgSQL EXCEPTION handlers from
    // catching expected errors like "relation already exists".
    const statements = sql
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    try {
      for (const stmt of statements) {
        await client.query(stmt + ';')
      }
      console.log('✓')
      applied++
    } catch (err: any) {
      console.log('❌')
      console.error(`     ${err.message}`)
      failed++
      // Continue applying remaining migrations
    }
  }

  await client.end()

  console.log(`\n  ${applied} applied, ${failed} failed`)

  if (failed > 0) {
    console.error('\n❌ Some migrations failed. Check errors above.')
    process.exit(1)
  }

  console.log('\n✅ All migrations applied successfully!')
  console.log('\n   Next steps:')
  console.log('   1. spine-framework install-app <app-slug>')
  console.log('   2. npm run assemble && netlify dev')
}

export function registerMigrateCommands(program: Command) {
  program
    .command('migrate')
    .description('Apply SQL migrations via direct Postgres connection')
    .option('--db-password <password>', 'DB password override (default: reads SUPABASE_DB_PASSWORD from .env)')
    .option('--dry-run', 'Show what would happen without making changes', false)
    .action(async (opts) => {
      try {
        await migrateCommand(opts)
      } catch (err: any) {
        console.error('Error:', err.message)
        if (process.env.SPINE_CLI_DEBUG) console.error(err.stack)
        process.exit(1)
      }
    })
}
