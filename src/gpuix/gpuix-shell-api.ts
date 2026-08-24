/**
 * Minimal preload API surface for the GPUIX shell.
 * Full renderer API will migrate incrementally from src/preload/index.ts.
 */
import { ipcRenderer } from '../main/gpuix/electron-shim'
import type { AppIdentity } from '../../shared/app-identity'
import type { Repo } from '../../shared/repo-types'
import type { Project } from '../../shared/project-types'
import type { GlobalSettings } from '../../shared/global-settings-types'

export type GpuixShellApi = {
  app: {
    getIdentity: () => Promise<AppIdentity>
  }
  settings: {
    get: () => Promise<GlobalSettings>
  }
  repos: {
    list: () => Promise<Repo[]>
  }
  projects: {
    list: () => Promise<Project[]>
  }
  pty: {
    rendererDispatcherReady: () => void
    setActiveRendererPty: (id: string, active: boolean) => void
    setRendererPtyVisible: (id: string, visible: boolean) => void
    spawn: (opts: { cols: number; rows: number; cwd?: string; command?: string }) => Promise<{
      id: string
      snapshot?: string
    }>
    write: (id: string, data: string) => void
    onData: (callback: (payload: { id: string; data: string }) => void) => () => void
    kill: (id: string) => Promise<void>
  }
}

export function createGpuixShellApi(): GpuixShellApi {
  return {
    app: {
      getIdentity: () => ipcRenderer.invoke('app:getIdentity') as Promise<AppIdentity>
    },
    settings: {
      get: () => ipcRenderer.invoke('settings:get') as Promise<GlobalSettings>
    },
    repos: {
      list: () => ipcRenderer.invoke('repos:list') as Promise<Repo[]>
    },
    projects: {
      list: () => ipcRenderer.invoke('projects:list') as Promise<Project[]>
    },
    pty: {
      rendererDispatcherReady: () => {
        ipcRenderer.send('pty:rendererDispatcherReady')
      },
      setActiveRendererPty: (id, active) => {
        ipcRenderer.send('pty:setActiveRendererPty', { id, active })
      },
      setRendererPtyVisible: (id, visible) => {
        ipcRenderer.send('pty:setRendererPtyVisible', { id, visible })
      },
      spawn: (opts) =>
        ipcRenderer.invoke('pty:spawn', opts) as Promise<{ id: string; snapshot?: string }>,
      write: (id, data) => {
        ipcRenderer.send('pty:write', { id, data })
      },
      onData: (callback) => {
        const listener = (_event: unknown, payload: { id: string; data: string }): void =>
          callback(payload)
        ipcRenderer.on('pty:data', listener)
        return () => ipcRenderer.removeListener('pty:data', listener)
      },
      kill: (id) => ipcRenderer.invoke('pty:kill', { id }) as Promise<void>
    }
  }
}
