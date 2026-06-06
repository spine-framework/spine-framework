interface InstallOptions {
  account?: string
  config?: string
}

export async function installCommand(appSlug: string, options: InstallOptions) {
  console.log(`Installing app: ${appSlug}`)
  
  if (options.account) {
    console.log(`Account ID: ${options.account}`)
  }
  
  if (options.config) {
    try {
      const config = JSON.parse(options.config)
      console.log(`Configuration:`, config)
    } catch (error) {
      console.error(`Invalid JSON configuration: ${options.config}`)
      process.exit(1)
    }
  }
  
  // Mock installation process
  console.log(`✅ App ${appSlug} installed successfully!`)
}
