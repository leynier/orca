/**
 * Registers Orca repo/worktree IPC handlers against the GPUIX electron shim window.
 */
import type { BrowserWindow } from './electron-shim'
import { registerRepoHandlers } from '../ipc/repos'
import { registerWorktreeHandlers } from '../ipc/worktrees'
import type { Store } from '../persistence'
import type { OrcaRuntimeService } from '../runtime/orca-runtime'

export function registerGpuixDomainHandlers(
  mainWindow: BrowserWindow,
  store: Store,
  runtime: OrcaRuntimeService
): void {
  registerRepoHandlers(mainWindow, store)
  registerWorktreeHandlers(mainWindow, store, runtime)
}
