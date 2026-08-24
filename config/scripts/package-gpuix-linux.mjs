#!/usr/bin/env node
/**
 * Package the GPUIX desktop host for Linux distribution as a tarball.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import process from 'node:process'

const ROOT = join(import.meta.dirname, '..', '..')
const OUT_DIR = join(ROOT, 'out', 'gpuix')
const STAGE_DIR = join(OUT_DIR, 'package')
const BUNDLE = join(OUT_DIR, 'orca-gpuix.js')

if (!existsSync(BUNDLE)) {
  console.error('[package-gpuix-linux] missing bundle — run pnpm run build:gpuix first')
  process.exit(1)
}

const version =
  process.env.ORCA_VERSION ?? JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version
const archiveBase = `orca-gpuix-${version}-linux-x64`

mkdirSync(join(STAGE_DIR, 'out', 'gpuix'), { recursive: true })
cpSync(BUNDLE, join(STAGE_DIR, 'out', 'gpuix', 'orca-gpuix.js'))
cpSync(join(ROOT, 'resources', 'gpuix', 'orca-gpuix.sh'), join(STAGE_DIR, 'orca-gpuix.sh'))
writeFileSync(
  join(STAGE_DIR, 'README.txt'),
  [
    'Orca GPUIX desktop host (Linux x64)',
    '',
    'Requirements:',
    '- Node.js 24+',
    '- libxkbcommon-x11-0, libvulkan1',
    '- pnpm install in repo root (node-pty, @gpuix/native)',
    '',
    'Run:',
    '  ./orca-gpuix.sh',
    '',
    `Version: ${version}`
  ].join('\n'),
  'utf8'
)

const archivePath = join(OUT_DIR, `${archiveBase}.tar.gz`)
execFileSync('tar', ['-czf', archivePath, '-C', STAGE_DIR, '.'], { stdio: 'inherit' })
console.log(`[package-gpuix-linux] wrote ${archivePath}`)
