/**
 * Minimal preload API surface for the GPUIX shell.
 * Full renderer API will migrate incrementally from src/preload/index.ts.
 */
import { ipcRenderer } from '../main/gpuix/electron-shim'
import type { AppIdentity } from '../../shared/app-identity'
import type { Settings } from '../../shared/settings-types'

export type GpuixShellApi = {
  app: {
    getIdentity: () => Promise<AppIdentity>
  }
  settings: {
    get: () => Promise<Settings>
  }
}

export function createGpuixShellApi(): GpuixShellApi {
  return {
    app: {
      getIdentity: () => ipcRenderer.invoke('app:getIdentity') as Promise<AppIdentity>
    },
    settings: {
      get: () => ipcRenderer.invoke('settings:get') as Promise<Settings>
    }
  }
}
