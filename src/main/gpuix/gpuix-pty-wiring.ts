import {
  getGpuixMainWindowSingleton,
  ipcMain,
  powerMonitor,
  type GpuixBrowserWindow
} from './electron-shim'
import { emitGpuixRendererDidFinishLoad } from './electron-shim-core'
import { setPtyHostBindings } from '../ipc/pty-host-bindings'
import { registerPtyHandlers } from '../ipc/pty'
import type { Store } from '../persistence'
import type { OrcaRuntimeService } from '../runtime/orca-runtime'

/** GPUIX main window stub — PTY handlers need a live webContents for renderer IPC. */
export function createGpuixMainWindow(): GpuixBrowserWindow {
  return getGpuixMainWindowSingleton()
}

export function wireGpuixPtyIpc(
  store: Store,
  runtime: OrcaRuntimeService,
  mainWindow: GpuixBrowserWindow
): void {
  setPtyHostBindings({ ipc: ipcMain, power: powerMonitor })
  registerPtyHandlers(mainWindow, runtime, undefined, () => store.getSettings(), undefined, store)
  emitGpuixRendererDidFinishLoad()
}
