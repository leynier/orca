/**
 * Minimal preload API surface for the GPUIX shell.
 * Full renderer API will migrate incrementally from src/preload/index.ts.
 */
import { ipcRenderer } from '../main/gpuix/electron-shim'
import type { AppIdentity } from '../../shared/app-identity'
import type { Repo } from '../../shared/repo-types'
import type { Project } from '../../shared/project-types'
import type { GlobalSettings } from '../../shared/global-settings-types'
import type { Worktree } from '../../shared/worktree/types'
import type { RuntimeStatus } from '../../shared/runtime-types'
import type { WorkspaceSessionState } from '../../shared/workspace-session-state-types'
import type { GitStatusResult } from '../../shared/git-status-types'

export type GpuixShellApi = {
  app: {
    getIdentity: () => Promise<AppIdentity>
  }
  runtime: {
    getStatus: () => Promise<RuntimeStatus>
  }
  session: {
    get: (hostId?: string | null) => Promise<WorkspaceSessionState>
  }
  settings: {
    get: () => Promise<GlobalSettings>
    onChanged: (callback: (updates: Partial<GlobalSettings>) => void) => () => void
  }
  repos: {
    list: () => Promise<Repo[]>
    onChanged: (callback: () => void) => () => void
  }
  projects: {
    list: () => Promise<Project[]>
  }
  worktrees: {
    listAll: () => Promise<Worktree[]>
    list: (repoId: string) => Promise<Worktree[]>
    metaSummary: () => Promise<{ count: number }>
    onChanged: (callback: () => void) => () => void
  }
  shell: {
    openUrl: (url: string) => Promise<void>
  }
  git: {
    status: (worktreePath: string) => Promise<GitStatusResult>
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
    runtime: {
      getStatus: () => ipcRenderer.invoke('runtime:getStatus') as Promise<RuntimeStatus>
    },
    session: {
      get: (hostId) => ipcRenderer.invoke('session:get', hostId) as Promise<WorkspaceSessionState>
    },
    settings: {
      get: () => ipcRenderer.invoke('settings:get') as Promise<GlobalSettings>,
      onChanged: (callback) => {
        const listener = (_event: unknown, updates: Partial<GlobalSettings>): void =>
          callback(updates)
        ipcRenderer.on('settings:changed', listener)
        return () => ipcRenderer.removeListener('settings:changed', listener)
      }
    },
    repos: {
      list: () => ipcRenderer.invoke('repos:list') as Promise<Repo[]>,
      onChanged: (callback) => {
        const listener = (): void => callback()
        ipcRenderer.on('repos:changed', listener)
        return () => ipcRenderer.removeListener('repos:changed', listener)
      }
    },
    projects: {
      list: () => ipcRenderer.invoke('projects:list') as Promise<Project[]>
    },
    worktrees: {
      listAll: () => ipcRenderer.invoke('worktrees:listAll') as Promise<Worktree[]>,
      list: (repoId) => ipcRenderer.invoke('worktrees:list', { repoId }) as Promise<Worktree[]>,
      metaSummary: () => ipcRenderer.invoke('worktrees:metaSummary') as Promise<{ count: number }>,
      onChanged: (callback) => {
        const listener = (): void => callback()
        ipcRenderer.on('worktrees:changed', listener)
        return () => ipcRenderer.removeListener('worktrees:changed', listener)
      }
    },
    shell: {
      openUrl: (url) => ipcRenderer.invoke('shell:openUrl', url) as Promise<void>
    },
    git: {
      status: (worktreePath) =>
        ipcRenderer.invoke('git:status', { worktreePath }) as Promise<GitStatusResult>
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
