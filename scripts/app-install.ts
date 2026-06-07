#!/usr/bin/env tsx

import { program } from 'commander'
import { execSync } from 'child_process'
import { existsSync } from 'fs'

program
  .name('app-install')
  .description('Install a Spine Framework app from NPM')
  .argument('<app-slug>', 'App slug to install (e.g., cortex, customer-portal)')
  .option('-v, --version <version>', 'Specific version to install', 'latest')
  .action((appSlug: string, options: { version: string }) => {
    console.log(`Installing ${appSlug}@${options.version}...`)
    
    try {
      // Install the app package
      console.log(`Installing spine-framework-${appSlug}@${options.version}...`)
      execSync(`npm install spine-framework-${appSlug}@${options.version}`, { stdio: 'inherit' })
      
      // Create custom/apps directory if it doesn't exist
      if (!existsSync('custom/apps')) {
        execSync('mkdir -p custom/apps', { stdio: 'inherit' })
      }
      
      // Copy app files to custom directory
      const appSource = `node_modules/spine-framework-${appSlug}/dist`
      if (existsSync(appSource)) {
        console.log(`Copying ${appSlug} files to custom/apps/${appSlug}...`)
        execSync(`cp -r ${appSource} custom/apps/${appSlug}`, { stdio: 'inherit' })
        console.log(`✅ ${appSlug} installed successfully!`)
        console.log(`\nNext steps:`)
        console.log(`1. Run 'npm run assemble' to rebuild the framework`)
        console.log(`2. Run 'npm run dev' to start development server`)
        console.log(`3. Visit your app at /${appSlug}`)
      } else {
        console.error(`❌ App package not found. Make sure spine-framework-${appSlug} is published correctly.`)
        process.exit(1)
      }
    } catch (error) {
      console.error(`❌ Failed to install ${appSlug}:`, error)
      process.exit(1)
    }
  })

program.parse()
