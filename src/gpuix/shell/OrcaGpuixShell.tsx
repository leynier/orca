import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { EventPayload } from '@gpuix/native'
import type { AppIdentity } from '../../shared/app-identity'
import type { Repo } from '../../shared/repo-types'
import type { Worktree } from '../../shared/worktree/types'
import type { RuntimeStatus } from '../../shared/runtime-types'
import type { GitStatusResult } from '../../shared/git-status-types'
import type { GpuixShellApi } from '../gpuix-shell-api'
import { gpuixKeyEventToTerminalInput } from './gpuix-terminal-key-input'

type OrcaGpuixShellProps = {
  version: string
}

function getApi(): GpuixShellApi | null {
  return (globalThis as { api?: GpuixShellApi }).api ?? null
}

export function OrcaGpuixShell({ version }: OrcaGpuixShellProps): React.JSX.Element {
  const [identity, setIdentity] = useState<AppIdentity | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [worktrees, setWorktrees] = useState<Worktree[]>([])
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null)
  const [selectedWorktreeId, setSelectedWorktreeId] = useState<string | null>(null)
  const [worktreeCount, setWorktreeCount] = useState<number | null>(null)
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null)
  const [gitStatus, setGitStatus] = useState<GitStatusResult | null>(null)
  const [gitStatusBusy, setGitStatusBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [terminalOutput, setTerminalOutput] = useState('')
  const [ptyId, setPtyId] = useState<string | null>(null)
  const [terminalBusy, setTerminalBusy] = useState(false)
  const outputRef = useRef('')
  const selectedRepoIdRef = useRef<string | null>(null)

  useEffect(() => {
    selectedRepoIdRef.current = selectedRepoId
  }, [selectedRepoId])

  const refreshWorktrees = useCallback(async (api: GpuixShellApi, repoId: string | null) => {
    try {
      const rows = repoId ? await api.worktrees.list(repoId) : await api.worktrees.listAll()
      setWorktrees(rows)
      const summary = await api.worktrees.metaSummary()
      setWorktreeCount(summary.count)
    } catch {
      setWorktrees([])
      setWorktreeCount(0)
    }
  }, [])

  useEffect(() => {
    const api = getApi()
    if (!api) {
      setError('GPUIX shell API is not available.')
      return
    }
    api.pty.rendererDispatcherReady()

    const loadRepos = (): void => {
      void api.repos
        .list()
        .then((value) => {
          setRepos(value)
          setSelectedRepoId((current) => current ?? value[0]?.id ?? null)
        })
        .catch(() => setRepos([]))
    }

    void api.app
      .getIdentity()
      .then((value) => setIdentity(value))
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })

    void api.runtime
      .getStatus()
      .then((status) => setRuntimeStatus(status))
      .catch(() => setRuntimeStatus(null))

    loadRepos()
    void refreshWorktrees(api, null)

    const unsubRepos = api.repos.onChanged(loadRepos)
    const unsubWorktrees = api.worktrees.onChanged(() => {
      void refreshWorktrees(api, selectedRepoIdRef.current)
    })

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

    return () => {
      unsubRepos()
      unsubWorktrees()
    }
    // Mount-only: terminal auto-spawn and IPC subscriptions should not re-run on repo selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount gate
  }, [refreshWorktrees])

  useEffect(() => {
    const api = getApi()
    if (!api) {
      return
    }
    void refreshWorktrees(api, selectedRepoId)
  }, [selectedRepoId, refreshWorktrees])

  useEffect(() => {
    const api = getApi()
    if (!api || !selectedWorktreeId) {
      setGitStatus(null)
      return
    }
    const worktree = worktrees.find((row) => row.id === selectedWorktreeId)
    if (!worktree?.path) {
      setGitStatus(null)
      return
    }
    setGitStatusBusy(true)
    void api.git
      .status(worktree.path)
      .then((status) => setGitStatus(status))
      .catch(() => setGitStatus(null))
      .finally(() => setGitStatusBusy(false))
  }, [selectedWorktreeId, worktrees])

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

  const spawnTerminal = (cwd?: string): void => {
    const api = getApi()
    if (!api || terminalBusy) {
      return
    }
    setTerminalBusy(true)
    outputRef.current = ''
    setTerminalOutput('')
    void api.pty
      .spawn({ cols: 80, rows: 24, cwd, command: '/bin/bash' })
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

  const handleTerminalKeyDown = (event: EventPayload): void => {
    const api = getApi()
    if (!api || !ptyId) {
      return
    }
    const input = gpuixKeyEventToTerminalInput(event)
    if (input) {
      api.pty.write(ptyId, input)
    }
  }

  const repoWorktrees = selectedRepoId
    ? worktrees.filter((row) => row.repoId === selectedRepoId)
    : worktrees

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
          width: 240,
          borderRightWidth: 1,
          borderRightColor: '#2a2f3a',
          borderRightStyle: 'solid',
          padding: 12,
          gap: 8,
          minHeight: 0
        }}
      >
        <text style={{ fontSize: 16, fontWeight: 600 }}>Orca</text>
        <text style={{ fontSize: 11, color: '#9aa3b2' }}>GPUIX · v{version}</text>

        <text style={{ fontSize: 12, color: '#7dd3fc', marginTop: 8 }}>Repositories</text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {repos.length === 0 ? (
            <text style={{ fontSize: 11, color: '#9aa3b2' }}>No repos yet</text>
          ) : (
            repos.slice(0, 8).map((repo) => (
              <div
                key={repo.id}
                tabIndex={0}
                onClick={() => {
                  setSelectedRepoId(repo.id)
                  setSelectedWorktreeId(null)
                }}
                style={{
                  backgroundColor: selectedRepoId === repo.id ? '#1e293b' : 'transparent',
                  borderRadius: 4,
                  padding: 4,
                  cursor: 'pointer'
                }}
              >
                <text style={{ fontSize: 11, color: '#c4cad4' }}>
                  {repo.displayName || repo.id}
                </text>
              </div>
            ))
          )}
        </div>

        <text style={{ fontSize: 12, color: '#7dd3fc', marginTop: 8 }}>Worktrees</text>
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
            <text style={{ fontSize: 11, color: '#9aa3b2' }}>No worktrees</text>
          ) : (
            repoWorktrees.slice(0, 24).map((worktree) => (
              <div
                key={worktree.id}
                tabIndex={0}
                onClick={() => {
                  setSelectedWorktreeId(worktree.id)
                  spawnTerminal(worktree.path)
                }}
                style={{
                  backgroundColor: selectedWorktreeId === worktree.id ? '#1e293b' : 'transparent',
                  borderRadius: 4,
                  padding: 4,
                  cursor: 'pointer'
                }}
              >
                <text style={{ fontSize: 11, color: '#e8eaed' }}>
                  {worktree.displayName || worktree.branch || worktree.path}
                </text>
                {worktree.branch ? (
                  <text style={{ fontSize: 10, color: '#9aa3b2' }}>{worktree.branch}</text>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div
          tabIndex={0}
          onClick={() => spawnTerminal()}
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
          <StatusCard
            label="Runtime"
            value={
              runtimeStatus
                ? `${runtimeStatus.graphStatus} · ${runtimeStatus.liveTabCount} tabs`
                : '…'
            }
          />
          <StatusCard label="PTY" value={ptyId ?? 'none'} />
        </div>

        {error ? <text style={{ color: '#fca5a5', fontSize: 12 }}>Error: {error}</text> : null}

        {selectedWorktreeId ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 16,
              backgroundColor: '#161b22',
              borderRadius: 8,
              padding: 10
            }}
          >
            <text style={{ fontSize: 11, color: '#9aa3b2' }}>
              Git: {gitStatusBusy ? 'loading…' : formatGitStatusSummary(gitStatus)}
            </text>
          </div>
        ) : null}

        <div
          tabIndex={0}
          autoFocus
          onKeyDown={handleTerminalKeyDown}
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
            Terminal (click here, type to send keys via pty:write)
          </text>
          <text style={{ fontSize: 12, color: '#e8eaed', whiteSpace: 'pre-wrap' }}>
            {terminalOutput || 'Select a worktree or click “Open terminal”.'}
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

function formatGitStatusSummary(status: GitStatusResult | null): string {
  if (!status) {
    return 'no status'
  }
  const branch = status.branch ?? 'detached'
  const changes = status.entries.length
  const upstream = status.upstreamStatus
  const sync = upstream?.hasUpstream ? ` ↑${upstream.ahead} ↓${upstream.behind}` : ''
  return `${branch} · ${changes} change${changes === 1 ? '' : 's'}${sync}`
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex -- strip terminal ANSI escapes for plain-text preview
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
}
