/**
 * Minimal IPC handlers for the GPUIX shell bootstrap.
 * Avoids Electron-only modules (tray, dock badge, native dialogs) during migration.
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
}
