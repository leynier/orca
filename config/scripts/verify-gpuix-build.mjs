#!/usr/bin/env node
/**
 * Verify the GPUIX bundle boots and exits cleanly after backend init.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const ROOT = join(import.meta.dirname, '..', '..')
const bundle = join(ROOT, 'out', 'gpuix', 'orca-gpuix.js')

if (!existsSync(bundle)) {
  console.error('[verify-gpuix-build] missing bundle — run pnpm run build:gpuix first')
  process.exit(1)
}

const child = spawn(process.execPath, [bundle], {
  cwd: ROOT,
  env: {
    ...process.env,
    ORCA_USER_DATA: join(ROOT, '.orca-gpuix-verify')
  },
  stdio: ['ignore', 'pipe', 'pipe']
})

let output = ''
child.stdout?.on('data', (chunk) => {
  output += chunk
})
child.stderr?.on('data', (chunk) => {
  output += chunk
})

const timeout = setTimeout(() => {
  child.kill('SIGTERM')
}, 12000)

child.on('exit', (code, signal) => {
  clearTimeout(timeout)
  if (output.includes('[gpuix] mount complete')) {
    console.log('[verify-gpuix-build] ok — GPUIX window mounted')
    process.exit(0)
  }
  console.error('[verify-gpuix-build] failed', { code, signal, output })
  process.exit(1)
})
