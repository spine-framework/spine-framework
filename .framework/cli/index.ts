#!/usr/bin/env node
/// <reference types="node" />
/**
 * @module cli/index
 * @audience installer
 * @layer cli
 * @stability stable
 *
 * Spine CLI entry point (`npx spine-framework`). Registers all command groups via
 * Commander and delegates each subcommand to the same core logic used by
 * API handlers and direct imports. No business logic lives here — only
 * command registration and top-level error handling.
 *
 * **Command groups registered:**
 * | Group       | File                       |
 * |-------------|----------------------------|
 * | auth        | commands/auth.ts           |
 * | pipelines   | commands/pipelines.ts      |
 * | items       | commands/items.ts          |
 * | agents      | commands/agents.ts         |
 * | migrations  | commands/migrations.ts     |
 * | init        | commands/init.ts           |
 * | install-app | commands/install-app.ts    |
 * | update-app  | commands/update-app.ts     |
 * | publish     | commands/publish.ts        |
 * | status      | commands/status.ts         |
 * | uninstall   | commands/uninstall-app.ts  |
 *
 * **Usage:**
 * ```bash
 * npx spine-framework --help
 * npx spine-framework auth whoami
 * npx spine-framework pipelines run <id> --data '{"key":"value"}'
 * npx spine-framework items list --type support_ticket
 * npx spine-framework items get <id>
 * npx spine-framework agents run <thread-id> --message "Hello"
 * npx spine-framework migrations list
 * ```
 *
 * @seeAlso cli/context.ts (buildCliContext — constructs CoreContext for every command)
 * @seeAlso functions/_shared/index.ts (core functions exposed to CLI)
 */

import { Command } from 'commander'

const program = new Command()

program
  .name('spine-framework')
  .description('Spine v2 CLI — interact with your Spine instance from the terminal or agentic IDE')
  .version('2.0.0')
  .option('--account <id>', 'Override the account ID for this command')

// Commands that do NOT need DB/env — safe to run on a fresh install
const { registerInitCommands }    = await import('./commands/init.ts')
const { registerMigrateCommands } = await import('./commands/migrate.ts')
registerInitCommands(program)
registerMigrateCommands(program)

// All other commands require SUPABASE_URL to be set — only load if not init/migrate
const subcommand = process.argv[2]
const noDbCommands = ['init', 'migrate', '--help', '-h', '--version', '-V', undefined]

if (!noDbCommands.includes(subcommand)) {
  await import('./env-loader.ts')

  const [
    { registerAuthCommands },
    { registerPipelineCommands },
    { registerItemCommands },
    { registerAgentCommands },
    { registerMigrationCommands },
    { registerDoctorCommands },
    { registerDevCommands },
    { registerTestCommands },
    { registerSystemCommands },
    { registerGenerateCommands },
    { registerCreateAppCommands },
    { registerInstallAppCommands },
    { registerUpdateAppCommands },
    { registerPublishCommands },
    { registerStatusCommands },
    { registerUninstallAppCommands },
  ] = await Promise.all([
    import('./commands/auth.ts'),
    import('./commands/pipelines.ts'),
    import('./commands/items.ts'),
    import('./commands/agents.ts'),
    import('./commands/migrations.ts'),
    import('./commands/doctor.ts'),
    import('./commands/dev.ts'),
    import('./commands/test.ts'),
    import('./commands/system.ts'),
    import('./commands/generate.ts'),
    import('./commands/create-app.ts'),
    import('./commands/install-app.ts'),
    import('./commands/update-app.ts'),
    import('./commands/publish.ts'),
    import('./commands/status.ts'),
    import('./commands/uninstall-app.ts'),
  ])

  registerAuthCommands(program)
  registerPipelineCommands(program)
  registerItemCommands(program)
  registerAgentCommands(program)
  registerMigrationCommands(program)
  registerDoctorCommands(program)
  registerDevCommands(program)
  registerTestCommands(program)
  registerSystemCommands(program)
  registerGenerateCommands(program)
  registerCreateAppCommands(program)
  registerInstallAppCommands(program)
  registerUpdateAppCommands(program)
  registerPublishCommands(program)
  registerStatusCommands(program)
  registerUninstallAppCommands(program)
}

program.parseAsync(process.argv).catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
