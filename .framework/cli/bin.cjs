#!/usr/bin/env node
// Thin shebang wrapper — invokes the TypeScript CLI via tsx.
// This file is the npm bin entry point for spine-framework.
const { execFileSync } = require('child_process')
const { resolve } = require('path')

const tsx = resolve(__dirname, '../../node_modules/.bin/tsx')
const entry = resolve(__dirname, 'index.ts')

try {
  execFileSync(tsx, [entry, ...process.argv.slice(2)], { stdio: 'inherit' })
} catch (e) {
  process.exit(e.status ?? 1)
}
