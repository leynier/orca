#!/usr/bin/env node
/**
 * Package the GPUIX desktop host for the current platform.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import process from 'node:process'
import { arch, platform } from 'node:os'

const ROOT = join(import.meta.dirname, '..', '..')
const OUT_DIR = join(ROOT, 'out', 'gpuix')
const STAGE_DIR = join(OUT_DIR, 'package')
const BUNDLE = join(OUT_DIR, 'orca-gpuix.js')

if (!existsSync(BUNDLE)) {
  console.error('[package-gpuix] missing bundle — run pnpm run build:gpuix first')
  process.exit(1)
}

const version =
  process.env.ORCA_VERSION ?? JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version

const osName = platform()
const cpu = arch()
const platformTag =
  osName === 'darwin'
    ? `macos-${cpu === 'arm64' ? 'arm64' : 'x64'}`
    : osName === 'win32'
      ? `windows-${cpu === 'arm64' ? 'arm64' : 'x64'}`
      : `linux-${cpu === 'arm64' ? 'arm64' : 'x64'}`

const archiveBase = `orca-gpuix-${version}-${platformTag}`

mkdirSync(join(STAGE_DIR, 'out', 'gpuix'), { recursive: true })
cpSync(BUNDLE, join(STAGE_DIR, 'out', 'gpuix', 'orca-gpuix.js'))

if (osName === 'win32') {
  cpSync(join(ROOT, 'resources', 'gpuix', 'orca-gpuix.cmd'), join(STAGE_DIR, 'orca-gpuix.cmd'))
} else {
  cpSync(join(ROOT, 'resources', 'gpuix', 'orca-gpuix.sh'), join(STAGE_DIR, 'orca-gpuix.sh'))
}

const requirements =
  osName === 'darwin'
    ? ['- macOS 12+', '- Node.js 24+', '- pnpm install in repo root (node-pty, @gpuix/native)']
    : osName === 'win32'
      ? ['- Windows 10+', '- Node.js 24+', '- pnpm install in repo root (node-pty, @gpuix/native)']
      : [
          '- Node.js 24+',
          '- libxkbcommon-x11-0, libvulkan1',
          '- pnpm install in repo root (node-pty, @gpuix/native)'
        ]

const runLine = osName === 'win32' ? '  orca-gpuix.cmd' : '  ./orca-gpuix.sh'

writeFileSync(
  join(STAGE_DIR, 'README.txt'),
  [
    `Orca GPUIX desktop host (${platformTag})`,
    '',
    'Requirements:',
    ...requirements,
    '',
    'Run:',
    runLine,
    '',
    `Version: ${version}`
  ].join('\n'),
  'utf8'
)

let archivePath
if (osName === 'win32') {
  archivePath = join(OUT_DIR, `${archiveBase}.zip`)
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path '${STAGE_DIR}\\*' -DestinationPath '${archivePath}' -Force`
    ],
    { stdio: 'inherit' }
  )
} else {
  archivePath = join(OUT_DIR, `${archiveBase}.tar.gz`)
  execFileSync('tar', ['-czf', archivePath, '-C', STAGE_DIR, '.'], { stdio: 'inherit' })
}

console.log(`[package-gpuix] wrote ${archivePath}`)
