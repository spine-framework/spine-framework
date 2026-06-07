/// <reference types="node" />
/**
 * @module cli/commands/dev
 * @audience installer
 * @layer cli
 * @stability stable
 *
 * `spine-framework dev` command — assemble and start the Netlify dev server.
 *
 * **What happens:**
 * 1. Runs `npm run assemble` to merge framework + custom apps
 * 2. Starts `netlify dev` (which runs Vite + Netlify Functions)
 *
 * **Usage:**
 * ```bash
 * spine-framework dev
 * spine-framework dev --no-assemble   # skip assembly step
 * ```
 *
 * @seeAlso scripts/assemble.sh (assembly script)
 * @seeAlso netlify.toml (Netlify dev configuration)
 */

import type { Command } from 'commander'
import { spawn } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = process.cwd()

// ─── COMMAND REGISTRATION ──────────────────────────────────────────────────

export function registerDevCommands(program: Command) {
  program
    .command('dev')
    .description('Assemble and start the Netlify dev server')
    .option('--no-assemble', 'Skip the assembly step')
    .action(async (opts) => {
      console.log('\n🚀 Starting Spine dev server...\n')

      try {
        // Step 1: Assembly
        if (opts.assemble !== false) {
          console.log('📦 Step 1: Assembling...')
          const assemblyExitCode = await runCommand('npm', ['run', 'assemble'], PROJECT_ROOT)

          if (assemblyExitCode !== 0) {
            console.error('\n❌ Assembly failed. Please check the errors above.')
            process.exit(1)
          }
          console.log('✓ Assembly complete\n')
        } else {
          console.log('⏭️  Step 1: Skipping assembly (--no-assemble)\n')
        }

        // Step 2: Start netlify dev
        console.log('🌐 Step 2: Starting netlify dev...')
        console.log('   (Press Ctrl+C to stop)\n')

        const netlifyBin = resolve(PROJECT_ROOT, 'node_modules/.bin/netlify')
        const cmd = existsSync(netlifyBin) ? netlifyBin : 'netlify'

        const netlify = spawn(cmd, ['dev'], {
          cwd: PROJECT_ROOT,
          stdio: 'inherit',
          env: { ...process.env }
        })

        netlify.on('exit', (code) => {
          process.exit(code || 0)
        })

        process.on('SIGINT', () => {
          console.log('\n\n🛑 Shutting down...')
          netlify.kill('SIGTERM')
        })

        process.on('SIGTERM', () => {
          netlify.kill('SIGTERM')
        })

      } catch (err: any) {
        console.error('\n❌ Error:', err.message)
        if (process.env.SPINE_CLI_DEBUG) {
          console.error(err.stack)
        }
        process.exit(1)
      }
    })
}

// ─── HELPER ────────────────────────────────────────────────────────────────

function runCommand(command: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env
    })

    proc.on('exit', (code) => {
      resolve(code || 0)
    })

    proc.on('error', (err) => {
      reject(err)
    })
  })
}
