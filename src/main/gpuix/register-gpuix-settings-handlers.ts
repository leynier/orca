/**
 * GPUIX settings IPC — subset without Electron menu/app-icon side effects.
 */
import { ipcMain } from './electron-shim'
import { getGpuixMainWindowSingleton } from './electron-shim'
import type { Store } from '../persistence'

export function registerGpuixSettingsHandlers(store: Store): void {
  ipcMain.handle('settings:get', () => store.getSettings())

  store.onSettingsChanged((updates, _settings, originWebContentsId) => {
    const window = getGpuixMainWindowSingleton()
    const isOrigin =
      originWebContentsId !== undefined && window.webContents.id === originWebContentsId
    if (!window.isDestroyed() && !isOrigin) {
      window.webContents.send('settings:changed', updates)
    }
  })
}
