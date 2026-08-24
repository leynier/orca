/**
 * Registers Orca repo/worktree IPC handlers against the GPUIX electron shim window.
 */
import type { GpuixBrowserWindow } from './electron-shim'
import { registerRepoHandlers, setRepoRemoteClientNotifier } from '../ipc/repos'
import { registerWorktreeHandlers } from '../ipc/worktrees'
import { registerShellHandlers } from '../ipc/shell'
import { registerWorkspaceCleanupHandlers } from '../ipc/workspace-cleanup'
import { registerSessionHandlers } from '../ipc/session'
import { registerRuntimeHandlers } from '../ipc/runtime'
import { registerGpuixSettingsHandlers } from './register-gpuix-settings-handlers'
import { registerGpuixGitHandlers } from './register-gpuix-git-handlers'
import {
  scheduleWorktreeBaseDirectoryWatcherSync,
  setWorktreeBaseDirectoryWatcherSyncContext
} from '../ipc/worktree-base-directory-watcher'
import { startFolderRepoGitUpgradeWatch } from '../ipc/folder-repo-git-upgrade'
import { getLocalPtyProvider } from '../ipc/pty'
import type { Store } from '../persistence'
import type { OrcaRuntimeService } from '../runtime/orca-runtime'

export function registerGpuixDomainHandlers(
  mainWindow: GpuixBrowserWindow,
  store: Store,
  runtime: OrcaRuntimeService
): void {
  registerRepoHandlers(mainWindow, store)
  setRepoRemoteClientNotifier(runtime)
  registerWorktreeHandlers(mainWindow, store, runtime)
  setWorktreeBaseDirectoryWatcherSyncContext(store, mainWindow)
  scheduleWorktreeBaseDirectoryWatcherSync(store, mainWindow)
  startFolderRepoGitUpgradeWatch(store, mainWindow)
  registerGpuixSettingsHandlers(store)
  registerGpuixGitHandlers(store)
  registerShellHandlers(store)
  registerSessionHandlers(store)
  registerRuntimeHandlers(runtime)
  registerWorkspaceCleanupHandlers(store, { runtime, getLocalPtyProvider })
}
