import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface InitOptions {
  template: string
}

export async function initCommand(projectName: string, options: InitOptions) {
  const targetDir = path.resolve(process.cwd(), projectName)
  
  if (fs.existsSync(targetDir)) {
    console.error(`Directory ${projectName} already exists`)
    process.exit(1)
  }

  console.log(`Creating Spine Framework project: ${projectName}`)
  
  // Create project directory
  fs.mkdirSync(targetDir, { recursive: true })
  
  // Create basic project structure
  const dirs = [
    'src',
    'src/components',
    'src/pages', 
    'src/hooks',
    'src/contexts',
    'src/utils',
    'functions',
    'migrations'
  ]
  
  dirs.forEach(dir => {
    fs.mkdirSync(path.join(targetDir, dir), { recursive: true })
  })
  
  // Create package.json
  const packageJson = {
    name: projectName,
    version: '0.1.0',
    description: 'Spine Framework application',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
      typeCheck: 'tsc --noEmit'
    },
    dependencies: {
      'spine-framework': '^1.0.0',
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'react-router-dom': '^6.8.0'
    },
    devDependencies: {
      '@types/react': '^18.0.0',
      '@types/react-dom': '^18.0.0',
      'typescript': '^5.0.0',
      'vite': '^5.0.0'
    }
  }
  
  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  )
  
  // Create vite config
  const viteConfig = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../dist'
  }
})
`
  
  fs.writeFileSync(path.join(targetDir, 'vite.config.ts'), viteConfig)
  
  // Create tsconfig
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true
    },
    include: ['src'],
    references: [{ path: './tsconfig.node.json' }]
  }
  
  fs.writeFileSync(
    path.join(targetDir, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  )
  
  // Create main app file
  const mainApp = `
import React from 'react'
import { createRoot } from 'react-dom/client'
import { SpineProvider, AuthProvider, AppProvider } from 'spine-framework'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SpineProvider config={{
      database: {
        url: process.env.DATABASE_URL || '',
        poolSize: 10
      },
      auth: {
        providers: ['email'],
        sessionTimeout: '24h'
      },
      apps: {
        registry: 'https://registry.spine-framework.com',
        autoUpdate: true
      }
    }}>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </SpineProvider>
  </React.StrictMode>
)
`
  
  fs.writeFileSync(path.join(targetDir, 'src/main.tsx'), mainApp)
  
  // Create App component
  const appComponent = `
import React from 'react'
import { AppLayout, AuthGuard } from 'spine-framework'

function App() {
  return (
    <AuthGuard>
      <AppLayout>
        <div>
          <h1>Welcome to Spine Framework!</h1>
          <p>Your application is ready to build.</p>
        </div>
      </AppLayout>
    </AuthGuard>
  )
}

export default App
`
  
  fs.writeFileSync(path.join(targetDir, 'src/App.tsx'), appComponent)
  
  // Create index.html
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
`
  
  fs.writeFileSync(path.join(targetDir, 'index.html'), indexHtml)
  
  console.log(`✅ Project ${projectName} created successfully!`)
  console.log(`\nNext steps:`)
  console.log(`  cd ${projectName}`)
  console.log(`  npm install`)
  console.log(`  npm run dev`)
}
