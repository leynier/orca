import React from 'react'
import type { Repo } from '../../shared/repo-types'
import type { Worktree } from '../../shared/worktree/types'
import { gpuixShellTheme as t } from './gpuix-shell-theme'

type GpuixShellSidebarProps = {
  version: string
  repos: Repo[]
  worktrees: Worktree[]
  selectedRepoId: string | null
  selectedWorktreeId: string | null
  terminalBusy: boolean
  onSelectRepo: (repoId: string) => void
  onSelectWorktree: (worktree: Worktree) => void
  onOpenTerminal: () => void
}

export function GpuixShellSidebar({
  version,
  repos,
  worktrees,
  selectedRepoId,
  selectedWorktreeId,
  terminalBusy,
  onSelectRepo,
  onSelectWorktree,
  onOpenTerminal
}: GpuixShellSidebarProps): React.JSX.Element {
  const repoWorktrees = selectedRepoId
    ? worktrees.filter((row) => row.repoId === selectedRepoId)
    : worktrees

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 240,
        borderRightWidth: 1,
        borderRightColor: t.border,
        borderRightStyle: 'solid',
        padding: 12,
        gap: 8,
        minHeight: 0
      }}
    >
      <text style={{ fontSize: 16, fontWeight: 600 }}>Orca</text>
      <text style={{ fontSize: 11, color: t.muted }}>GPUIX · v{version}</text>

      <text style={{ fontSize: 12, color: t.accent, marginTop: 8 }}>Repositories</text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {repos.length === 0 ? (
          <text style={{ fontSize: 11, color: t.muted }}>No repos yet</text>
        ) : (
          repos.slice(0, 8).map((repo) => (
            <div
              key={repo.id}
              tabIndex={0}
              onClick={() => onSelectRepo(repo.id)}
              style={{
                backgroundColor: selectedRepoId === repo.id ? t.rowSelected : 'transparent',
                borderRadius: 4,
                padding: 4,
                cursor: 'pointer'
              }}
            >
              <text style={{ fontSize: 11, color: '#c4cad4' }}>{repo.displayName || repo.id}</text>
            </div>
          ))
        )}
      </div>

      <text style={{ fontSize: 12, color: t.accent, marginTop: 8 }}>Worktrees</text>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flexGrow: 1,
          minHeight: 0,
          overflow: 'scroll'
        }}
      >
        {repoWorktrees.length === 0 ? (
          <text style={{ fontSize: 11, color: t.muted }}>No worktrees</text>
        ) : (
          repoWorktrees.slice(0, 24).map((worktree) => (
            <div
              key={worktree.id}
              tabIndex={0}
              onClick={() => onSelectWorktree(worktree)}
              style={{
                backgroundColor: selectedWorktreeId === worktree.id ? t.rowSelected : 'transparent',
                borderRadius: 4,
                padding: 4,
                cursor: 'pointer'
              }}
            >
              <text style={{ fontSize: 11, color: t.foreground }}>
                {worktree.displayName || worktree.branch || worktree.path}
              </text>
              {worktree.branch ? (
                <text style={{ fontSize: 10, color: t.muted }}>{worktree.branch}</text>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div
        tabIndex={0}
        onClick={onOpenTerminal}
        style={{
          backgroundColor: t.primary,
          borderRadius: 6,
          padding: 8,
          cursor: 'pointer'
        }}
      >
        <text style={{ fontSize: 12, color: '#ffffff' }}>
          {terminalBusy ? 'Starting…' : 'Open terminal'}
        </text>
      </div>
    </div>
  )
}
