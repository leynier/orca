#!/usr/bin/env node
/**
 * Dev runner for the GPUIX desktop host.
 */
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import process from 'node:process'

const ROOT = join(import.meta.dirname, '..', '..')
const bundlePath = join(ROOT, 'out', 'gpuix', 'orca-gpuix.js')

const child = spawn(process.execPath, [bundlePath], {
  cwd: ROOT,
  env: {
    ...process.env,
    ORCA_USER_DATA: process.env.ORCA_USER_DATA ?? join(ROOT, '.orca-gpuix-dev')
  },
  stdio: 'inherit'
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
