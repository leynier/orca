/**
 * GPUIX git IPC — local worktree status and staging (no SSH / full filesystem surface).
 */
import { ipcMain } from './electron-shim'
import { getStatus, stageFile, unstageFile } from '../git/status'
import { getWorktreeSharedLinkPaths } from '../git/worktree-shared-directories'
import { validateGitRelativeFilePath } from '../ipc/filesystem-path-containment'
import { resolveRegisteredWorktreePath } from '../ipc/registered-worktree-roots-cache'
import {
  getLocalGitOptionsForRegisteredWorktree,
  getLocalGitOptionsForRepo,
  getLocalRepoForRegisteredWorktree
} from '../ipc/local-worktree-runtime-options'
import type { Store } from '../persistence'
import type { GitStatusResult } from '../../shared/git-status-types'

async function resolveLocalGitContext(
  store: Store,
  worktreePath: string
): Promise<{
  worktreePath: string
  gitOptions: ReturnType<typeof getLocalGitOptionsForRepo>
  sharedLinkPaths: string[]
}> {
  const resolvedPath = await resolveRegisteredWorktreePath(worktreePath, store)
  const repo = getLocalRepoForRegisteredWorktree(store, worktreePath, resolvedPath)
  const gitOptions = getLocalGitOptionsForRepo(store, repo)
  const sharedLinkPaths = repo ? getWorktreeSharedLinkPaths(repo) : []
  return { worktreePath: resolvedPath, gitOptions, sharedLinkPaths }
}

export function registerGpuixGitHandlers(store: Store): void {
  ipcMain.handle(
    'git:status',
    async (_event, args: { worktreePath: string }): Promise<GitStatusResult> => {
      const { worktreePath, gitOptions, sharedLinkPaths } = await resolveLocalGitContext(
        store,
        args.worktreePath
      )
      return await getStatus(worktreePath, {
        includeIgnored: false,
        ...gitOptions,
        ...(sharedLinkPaths.length > 0 ? { sharedLinkPaths } : {})
      })
    }
  )

  ipcMain.handle(
    'git:stage',
    async (_event, args: { worktreePath: string; filePath: string }): Promise<void> => {
      const worktreePath = await resolveRegisteredWorktreePath(args.worktreePath, store)
      const filePath = validateGitRelativeFilePath(worktreePath, args.filePath)
      const gitOptions = getLocalGitOptionsForRegisteredWorktree(
        store,
        args.worktreePath,
        worktreePath
      )
      await stageFile(worktreePath, filePath, gitOptions)
    }
  )

  ipcMain.handle(
    'git:unstage',
    async (_event, args: { worktreePath: string; filePath: string }): Promise<void> => {
      const worktreePath = await resolveRegisteredWorktreePath(args.worktreePath, store)
      const filePath = validateGitRelativeFilePath(worktreePath, args.filePath)
      const gitOptions = getLocalGitOptionsForRegisteredWorktree(
        store,
        args.worktreePath,
        worktreePath
      )
      await unstageFile(worktreePath, filePath, gitOptions)
    }
  )
}
