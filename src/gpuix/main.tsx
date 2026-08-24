/**
 * GPUIX renderer entry: wires the preload API into global scope and mounts the shell.
 */
import React from 'react'
import { render } from '@gpuix/react'
import { createGpuixShellApi } from './gpuix-shell-api'
import { OrcaGpuixShell } from './shell/OrcaGpuixShell'

declare const ORCA_GPUIX_VERSION: string

async function main(): Promise<void> {
  const api = createGpuixShellApi()
  ;(globalThis as { api?: typeof api }).api = api

  const version = typeof ORCA_GPUIX_VERSION === 'string' ? ORCA_GPUIX_VERSION : '0.0.0-gpuix'

  render(<OrcaGpuixShell version={version} />, {
    title: 'Orca',
    width: 960,
    height: 640,
    titlebarTransparent: true,
    windowBackground: 'blurred',
    trafficLightX: 16,
    trafficLightY: 17
  })
}

main().catch((error: unknown) => {
  console.error('[gpuix] renderer failed:', error)
  process.exit(1)
})
