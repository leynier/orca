/**
 * Boots Orca backend services for the GPUIX desktop host.
 * Registers IPC handlers against the in-process electron shim.
 */
import { installGpuixHostAdapters } from './gpuix-host-adapters'
import { registerGpuixShellHandlers } from './register-gpuix-shell-handlers'

import type { Store } from '../persistence'
import type { OrcaRuntimeService } from '../runtime/orca-runtime'

export type GpuixBackendHandle = {
  store: Store
  runtime: OrcaRuntimeService
}

export async function bootstrapGpuixBackend(): Promise<GpuixBackendHandle> {
  installGpuixHostAdapters()

  const { getAppEnvironment } = await import('../../shared/app-environment')
  const { Store } = await import('../persistence/loading-store/store')
  const { OrcaRuntimeService } = await import('../runtime/orca-runtime')
  const { registerHeadlessPtyRuntime, getLocalPtyProvider, getSshPtyProvider } =
    await import('../ipc/pty')
  const { initDataPath } = await import('../persistence')
  const { ensureActiveOrcaProfile, initOrcaProfilePaths } =
    await import('../orca-profiles/profile-index-store')
  const { initSshHostKeyStoreFile } = await import('../ssh/ssh-host-key-store')

  const userDataPath = getAppEnvironment().getPath('userData')
  initDataPath(userDataPath)
  initOrcaProfilePaths()
  const profile = ensureActiveOrcaProfile(userDataPath)
  initSshHostKeyStoreFile(profile.dataFile)

  const store = new Store({ dataFile: profile.dataFile })

  const runtime = new OrcaRuntimeService(store, undefined, {
    getLocalProvider: () => getLocalPtyProvider(),
    getSshProvider: (connectionId) => getSshPtyProvider(connectionId),
    canRecoverPersistentLocalPtys: () => true,
    getDesktopWindowStatus: () => 'openable'
  })

  registerHeadlessPtyRuntime(runtime, undefined, () => store.getSettings(), undefined, store)
  await runtime.refreshRestoredOrchestrationAuthority()
  await runtime.reconcileLegacyWorkerTerminals()

  registerGpuixShellHandlers(store)

  return { store, runtime }
}
