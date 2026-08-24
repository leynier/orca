#!/usr/bin/env node
/**
 * Bundle the GPUIX desktop host: Node backend + GPUIX renderer.
 * Aliases `electron` to the in-process shim so existing IPC handlers register without Chromium.
 */
import { build } from 'esbuild'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const OUT_DIR = join(ROOT, 'out', 'gpuix')
const BACKEND_ENTRY = join(ROOT, 'src/main/gpuix/main.ts')
const SHIM_PATH = join(ROOT, 'src/main/gpuix/electron-shim.ts')

const EXTERNAL = [
  'node-pty',
  '@parcel/watcher',
  '@gpuix/native',
  '@gpuix/react',
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'fsevents'
]

const assetExternal = {
  name: 'asset-external',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /\?(asset|asarUnpack)/ }, (args) => {
      const cleanPath = args.path.replace(/\?(asset|asarUnpack).*/, '')
      return { path: join(ROOT, cleanPath), external: true }
    })
  }
}

const electronShimAlias = {
  name: 'electron-shim-alias',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^electron$/ }, () => ({ path: SHIM_PATH }))
  }
}

const jsoncParserEsm = {
  name: 'jsonc-parser-esm',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^jsonc-parser$/ }, () => ({
      path: join(ROOT, 'node_modules', 'jsonc-parser', 'lib', 'esm', 'main.js')
    }))
  }
}

const externalNativeAddons = {
  name: 'external-native-addons',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /\.node$/ }, (args) => ({ path: args.path, external: true }))
  }
}

rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })

const version = process.env.ORCA_VERSION ?? '0.0.0-gpuix'

const result = await build({
  entryPoints: [BACKEND_ENTRY],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  outfile: join(OUT_DIR, 'orca-gpuix.js'),
  external: EXTERNAL,
  plugins: [assetExternal, electronShimAlias, jsoncParserEsm, externalNativeAddons],
  define: {
    'process.env.NODE_ENV': '"production"',
    ORCA_GPUIX_VERSION: JSON.stringify(version)
  },
  metafile: true,
  minify: false,
  sourcemap: true,
  logLevel: 'error'
})

const electronImporters = new Set()
for (const [file, info] of Object.entries(result.metafile.inputs)) {
  for (const imported of info.imports ?? []) {
    const resolvedPath = imported.path ?? ''
    if (resolvedPath.includes('electron-shim')) {
      continue
    }
    const specifier = imported.original ?? imported.path
    if (specifier === 'electron' && !file.includes('electron-shim')) {
      electronImporters.add(file)
    }
  }
}

if (electronImporters.size > 0) {
  console.error('[build-gpuix] bundled electron imports remain:')
  for (const file of electronImporters) {
    console.error(`  ${file}`)
  }
  process.exit(1)
}

console.log(`[build-gpuix] wrote ${join(OUT_DIR, 'orca-gpuix.js')}`)
