import React from 'react'
import type { GitStatusResult } from '../../shared/git-status-types'
import type { Worktree } from '../../shared/worktree/types'
import { formatGitStatusSummary } from './gpuix-git-status-summary'
import { gpuixShellTheme as t } from './gpuix-shell-theme'

type GpuixGitStatusPanelProps = {
  worktree: Worktree | null
  status: GitStatusResult | null
  busy: boolean
  onOpenInFileManager: (path: string) => void
}

export function GpuixGitStatusPanel({
  worktree,
  status,
  busy,
  onOpenInFileManager
}: GpuixGitStatusPanelProps): React.JSX.Element | null {
  if (!worktree) {
    return null
  }

  const entries = status?.entries.slice(0, 16) ?? []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        backgroundColor: t.card,
        borderRadius: 8,
        padding: 10
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <text style={{ fontSize: 11, color: t.muted, flexGrow: 1 }}>
          Git: {busy ? 'loading…' : formatGitStatusSummary(status)}
        </text>
        <div
          tabIndex={0}
          onClick={() => onOpenInFileManager(worktree.path)}
          style={{
            backgroundColor: t.rowSelected,
            borderRadius: 4,
            padding: 4,
            cursor: 'pointer'
          }}
        >
          <text style={{ fontSize: 10, color: t.foreground }}>Open folder</text>
        </div>
      </div>
      {entries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {entries.map((entry) => (
            <text
              key={`${entry.area}:${entry.path}`}
              style={{ fontSize: 10, color: gitStatusColor(entry.status) }}
            >
              {entry.area} {entry.status} {entry.path}
            </text>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function gitStatusColor(status: string): string {
  switch (status) {
    case 'added':
      return t.gitAdded
    case 'modified':
      return t.gitModified
    case 'deleted':
      return t.gitDeleted
    default:
      return t.muted
  }
}
