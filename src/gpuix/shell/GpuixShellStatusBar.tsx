import React from 'react'
import type { AppIdentity } from '../../shared/app-identity'
import type { RuntimeStatus } from '../../shared/runtime-types'
import { gpuixShellTheme as t } from './gpuix-shell-theme'

type GpuixShellStatusBarProps = {
  identity: AppIdentity | null
  repoCount: number
  worktreeCount: number | null
  runtimeStatus: RuntimeStatus | null
  preflightSummary: string | null
  ptyId: string | null
}

export function GpuixShellStatusBar({
  identity,
  repoCount,
  worktreeCount,
  runtimeStatus,
  preflightSummary,
  ptyId
}: GpuixShellStatusBarProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
      <StatusCard label="Profile" value={identity?.name ?? '…'} />
      <StatusCard label="Repos" value={String(repoCount)} />
      <StatusCard label="Worktrees" value={worktreeCount === null ? '…' : String(worktreeCount)} />
      <StatusCard
        label="Runtime"
        value={
          runtimeStatus ? `${runtimeStatus.graphStatus} · ${runtimeStatus.liveTabCount} tabs` : '…'
        }
      />
      <StatusCard label="Tools" value={preflightSummary ?? '…'} />
      <StatusCard label="PTY" value={ptyId ?? 'none'} />
    </div>
  )
}

function StatusCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        backgroundColor: t.card,
        borderRadius: 8,
        padding: 10,
        minWidth: 100,
        flexGrow: 1
      }}
    >
      <text style={{ fontSize: 10, color: t.muted }}>{label}</text>
      <text style={{ fontSize: 13, fontWeight: 500 }}>{value}</text>
    </div>
  )
}
