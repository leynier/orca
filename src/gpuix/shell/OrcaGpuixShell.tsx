import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { EventPayload } from '@gpuix/native'
import type { AppIdentity } from '../../shared/app-identity'
import type { Repo } from '../../shared/repo-types'
import type { Worktree } from '../../shared/worktree/types'
import type { RuntimeStatus } from '../../shared/runtime-types'
import type { GitStatusResult } from '../../shared/git-status-types'
import type { GpuixShellApi } from '../gpuix-shell-api'
import { GpuixGitStatusPanel } from './GpuixGitStatusPanel'
import { GpuixShellSidebar } from './GpuixShellSidebar'
import { GpuixShellStatusBar } from './GpuixShellStatusBar'
import { GpuixTerminalPanel, stripAnsi } from './GpuixTerminalPanel'
import { gpuixKeyEventToTerminalInput } from './gpuix-terminal-key-input'
import { gpuixShellTheme as t } from './gpuix-shell-theme'

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

  const selectedWorktree = selectedWorktreeId
    ? (worktrees.find((row) => row.id === selectedWorktreeId) ?? null)
    : null

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount gate
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
    if (!api || !selectedWorktree?.path) {
      setGitStatus(null)
      return
    }
    setGitStatusBusy(true)
    void api.git
      .status(selectedWorktree.path)
      .then((status) => setGitStatus(status))
      .catch(() => setGitStatus(null))
      .finally(() => setGitStatusBusy(false))
  }, [selectedWorktree])

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

  const openInFileManager = (path: string): void => {
    const api = getApi()
    if (!api) {
      return
    }
    void api.shell.openInFileManager(path)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        backgroundColor: t.canvas,
        color: t.foreground,
        fontFamily: 'monospace'
      }}
    >
      <GpuixShellSidebar
        version={version}
        repos={repos}
        worktrees={worktrees}
        selectedRepoId={selectedRepoId}
        selectedWorktreeId={selectedWorktreeId}
        terminalBusy={terminalBusy}
        onSelectRepo={(repoId) => {
          setSelectedRepoId(repoId)
          setSelectedWorktreeId(null)
        }}
        onSelectWorktree={(worktree) => {
          setSelectedWorktreeId(worktree.id)
          spawnTerminal(worktree.path)
        }}
        onOpenTerminal={() => spawnTerminal()}
      />

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
        <GpuixShellStatusBar
          identity={identity}
          repoCount={repos.length}
          worktreeCount={worktreeCount}
          runtimeStatus={runtimeStatus}
          ptyId={ptyId}
        />

        {error ? <text style={{ color: t.destructive, fontSize: 12 }}>Error: {error}</text> : null}

        <GpuixGitStatusPanel
          worktree={selectedWorktree}
          status={gitStatus}
          busy={gitStatusBusy}
          onOpenInFileManager={openInFileManager}
        />

        <GpuixTerminalPanel output={terminalOutput} onKeyDown={handleTerminalKeyDown} />
      </div>
    </div>
  )
}
