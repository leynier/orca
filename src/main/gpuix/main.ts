/** GPUIX desktop entry: boot Orca backend, then launch the native GPUIX window. */
import process from 'node:process'
import { bootstrapGpuixBackend } from './gpuix-backend-bootstrap'

async function main(): Promise<void> {
  console.log('[gpuix] booting Orca backend…')
  await bootstrapGpuixBackend()
  console.log('[gpuix] backend ready, launching GPUIX window…')
  await import('../../gpuix/main.tsx')
}

main().catch((error: unknown) => {
  console.error('[gpuix] failed to start:', error)
  process.exit(1)
})
