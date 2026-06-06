#!/usr/bin/env node

import { Command } from 'commander'
import { initCommand } from './commands/init'
import { installCommand } from './commands/install'
import { listCommand } from './commands/list'
import { migrateCommand } from './commands/migrate'

const program = new Command()

program
  .name('spine')
  .description('Spine Framework CLI - Build enterprise applications with ease')
  .version('1.0.0')

program
  .command('init')
  .description('Initialize a new Spine Framework project')
  .argument('<project-name>', 'Name of the project')
  .option('-t, --template <template>', 'Template to use', 'default')
  .action(initCommand)

program
  .command('install')
  .description('Install a Spine app')
  .argument('<app-slug>', 'Slug of the app to install')
  .option('-a, --account <account-id>', 'Account ID for installation')
  .option('-c, --config <config>', 'Configuration JSON')
  .action(installCommand)

program
  .command('list')
  .description('List available apps')
  .option('-a, --account <account-id>', 'Account ID to filter by')
  .option('-t, --type <type>', 'App type to filter by')
  .action(listCommand)

program
  .command('migrate')
  .description('Run database migrations')
  .option('-u, --up', 'Run pending migrations (default)')
  .option('-d, --down', 'Rollback last migration')
  .option('-c, --create <name>', 'Create new migration')
  .action(migrateCommand)

program.parse()
