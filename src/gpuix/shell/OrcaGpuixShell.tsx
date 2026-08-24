import React, { useEffect, useRef, useState } from 'react'
import type { AppIdentity } from '../../shared/app-identity'
import type { Repo } from '../../shared/repo-types'
import type { GpuixShellApi } from '../gpuix-shell-api'

type OrcaGpuixShellProps = {
  version: string
}

function getApi(): GpuixShellApi | null {
  return (globalThis as { api?: GpuixShellApi }).api ?? null
}

export function OrcaGpuixShell({ version }: OrcaGpuixShellProps): React.JSX.Element {
  const [identity, setIdentity] = useState<AppIdentity | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [worktreeCount, setWorktreeCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [terminalOutput, setTerminalOutput] = useState('')
  const [ptyId, setPtyId] = useState<string | null>(null)
  const [terminalBusy, setTerminalBusy] = useState(false)
  const outputRef = useRef('')

  useEffect(() => {
    const api = getApi()
    if (!api) {
      setError('GPUIX shell API is not available.')
      return
    }
    api.pty.rendererDispatcherReady()
    void api.app
      .getIdentity()
      .then((value) => setIdentity(value))
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })
    void api.repos
      .list()
      .then((value) => setRepos(value))
      .catch(() => setRepos([]))
    void api.worktrees
      .metaSummary()
      .then((summary) => setWorktreeCount(summary.count))
      .catch(() => setWorktreeCount(0))

    void api.pty
      .spawn({ cols: 80, rows: 24, command: '/bin/bash -lc "echo Orca GPUIX terminal ready"' })
      .then((result) => {
        setPtyId(result.id)
        api.pty.setActiveRendererPty(result.id, true)
        api.pty.setRendererPtyVisible(result.id, true)
        if (result.snapshot) {
          outputRef.current = stripAnsi(result.snapshot)
          setTerminalOutput(outputRef.current)
        }
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })
  }, [])

  useEffect(() => {
    const api = getApi()
    if (!api || !ptyId) {
      return
    }
    return api.pty.onData((payload) => {
      if (payload.id !== ptyId) {
        return
      }
      outputRef.current += stripAnsi(payload.data)
      setTerminalOutput(outputRef.current)
    })
  }, [ptyId])

  const spawnTerminal = (): void => {
    const api = getApi()
    if (!api || terminalBusy) {
      return
    }
    setTerminalBusy(true)
    outputRef.current = ''
    setTerminalOutput('')
    void api.pty
      .spawn({ cols: 80, rows: 24, command: '/bin/bash' })
      .then((result) => {
        setPtyId(result.id)
        api.pty.setActiveRendererPty(result.id, true)
        api.pty.setRendererPtyVisible(result.id, true)
        if (result.snapshot) {
          outputRef.current = stripAnsi(result.snapshot)
          setTerminalOutput(outputRef.current)
        }
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => setTerminalBusy(false))
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        backgroundColor: '#0f1117',
        color: '#e8eaed',
        fontFamily: 'monospace'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 220,
          borderRightWidth: 1,
          borderRightColor: '#2a2f3a',
          borderRightStyle: 'solid',
          padding: 12,
          gap: 8
        }}
      >
        <text style={{ fontSize: 16, fontWeight: 600 }}>Orca</text>
        <text style={{ fontSize: 11, color: '#9aa3b2' }}>GPUIX · v{version}</text>
        <text style={{ fontSize: 12, color: '#7dd3fc', marginTop: 8 }}>Repositories</text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1 }}>
          {repos.length === 0 ? (
            <text style={{ fontSize: 11, color: '#9aa3b2' }}>No repos yet</text>
          ) : (
            repos.slice(0, 12).map((repo) => (
              <text key={repo.id} style={{ fontSize: 11, color: '#c4cad4' }}>
                {repo.displayName || repo.id}
              </text>
            ))
          )}
        </div>
        <div
          tabIndex={0}
          onClick={spawnTerminal}
          style={{
            backgroundColor: '#2563eb',
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

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minWidth: 0,
          padding: 16,
          gap: 12
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
          <StatusCard label="Profile" value={identity?.name ?? '…'} />
          <StatusCard label="Repos" value={String(repos.length)} />
          <StatusCard
            label="Worktrees"
            value={worktreeCount === null ? '…' : String(worktreeCount)}
          />
          <StatusCard label="PTY" value={ptyId ?? 'none'} />
        </div>

        {error ? <text style={{ color: '#fca5a5', fontSize: 12 }}>Error: {error}</text> : null}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            minHeight: 0,
            backgroundColor: '#161b22',
            borderRadius: 8,
            padding: 12,
            overflow: 'scroll'
          }}
        >
          <text style={{ fontSize: 11, color: '#9aa3b2', marginBottom: 8 }}>
            Terminal output (node-pty via in-process IPC)
          </text>
          <text style={{ fontSize: 12, color: '#e8eaed', whiteSpace: 'pre-wrap' }}>
            {terminalOutput || 'Click “Open terminal” to spawn a shell.'}
          </text>
        </div>
      </div>
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
        backgroundColor: '#161b22',
        borderRadius: 8,
        padding: 10,
        minWidth: 100,
        flexGrow: 1
      }}
    >
      <text style={{ fontSize: 10, color: '#9aa3b2' }}>{label}</text>
      <text style={{ fontSize: 13, fontWeight: 500 }}>{value}</text>
    </div>
  )
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex -- strip terminal ANSI escapes for plain-text preview
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
}
