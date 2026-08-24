/**
 * GPUIX git IPC — local worktree status only (no SSH / full filesystem surface).
 */
import { ipcMain } from './electron-shim'
import { getStatus } from '../git/status'
import { getWorktreeSharedLinkPaths } from '../git/worktree-shared-directories'
import { resolveRegisteredWorktreePath } from '../ipc/registered-worktree-roots-cache'
import {
  getLocalGitOptionsForRepo,
  getLocalRepoForRegisteredWorktree
} from '../ipc/local-worktree-runtime-options'
import type { Store } from '../persistence'
import type { GitStatusResult } from '../../shared/git-status-types'

export function registerGpuixGitHandlers(store: Store): void {
  ipcMain.handle(
    'git:status',
    async (_event, args: { worktreePath: string }): Promise<GitStatusResult> => {
      const worktreePath = await resolveRegisteredWorktreePath(args.worktreePath, store)
      const repo = getLocalRepoForRegisteredWorktree(store, args.worktreePath, worktreePath)
      const gitOptions = getLocalGitOptionsForRepo(store, repo)
      const sharedLinkPaths = repo ? getWorktreeSharedLinkPaths(repo) : []
      return await getStatus(worktreePath, {
        includeIgnored: false,
        ...gitOptions,
        ...(sharedLinkPaths.length > 0 ? { sharedLinkPaths } : {})
      })
    }
  )
}
