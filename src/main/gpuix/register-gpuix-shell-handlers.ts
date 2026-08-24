/**
 * GPUIX IPC handlers — expands incrementally as renderer features migrate off Electron.
 */
import { ipcMain } from './electron-shim'
import type { Store } from '../persistence'
import type { AppIdentity } from '../../shared/app-identity'
import { getDevInstanceIdentity } from '../startup/dev-instance-identity'

export function registerGpuixShellHandlers(store: Store): void {
  ipcMain.handle('app:getIdentity', (): AppIdentity => {
    const identity = getDevInstanceIdentity(false)
    return {
      name: identity.name,
      isDev: identity.isDev,
      devLabel: identity.devLabel,
      devBranch: identity.devBranch,
      devWorktreeName: identity.devWorktreeName,
      devRepoRoot: identity.devRepoRoot,
      dockBadgeLabel: identity.dockBadgeLabel
    }
  })

  ipcMain.handle('settings:get', () => store.getSettings())

  ipcMain.handle('repos:list', () => store.getRepos())
  ipcMain.handle('projects:list', () => store.getProjects())

  ipcMain.handle('worktrees:metaSummary', () => {
    const meta = store.getAllWorktreeMeta()
    return { count: Object.keys(meta).length }
  })
}
