import React from 'react'
import type { EventPayload } from '@gpuix/native'
import { gpuixShellTheme as t } from './gpuix-shell-theme'

type GpuixTerminalPanelProps = {
  output: string
  onKeyDown: (event: EventPayload) => void
}

export function GpuixTerminalPanel({
  output,
  onKeyDown
}: GpuixTerminalPanelProps): React.JSX.Element {
  return (
    <div
      tabIndex={0}
      autoFocus
      onKeyDown={onKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        backgroundColor: t.card,
        borderRadius: 8,
        padding: 12,
        overflow: 'scroll'
      }}
    >
      <text style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>
        Terminal (click here, type to send keys via pty:write)
      </text>
      <text style={{ fontSize: 12, color: t.foreground, whiteSpace: 'pre-wrap' }}>
        {output || 'Select a worktree or click “Open terminal”.'}
      </text>
    </div>
  )
}

export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex -- strip terminal ANSI escapes for plain-text preview
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
}
