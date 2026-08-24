import React, { useEffect, useState } from 'react'
import type { AppIdentity } from '../../shared/app-identity'

type OrcaGpuixShellProps = {
  version: string
}

export function OrcaGpuixShell({ version }: OrcaGpuixShellProps): React.JSX.Element {
  const [identity, setIdentity] = useState<AppIdentity | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [workspaceCount, setWorkspaceCount] = useState<number | null>(null)

  useEffect(() => {
    const api = (globalThis as { api?: Window['api'] }).api
    if (!api) {
      setError('Preload API is not available on the GPUIX host.')
      return
    }
    void api.app
      .getIdentity()
      .then((value) => setIdentity(value))
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })
    void api.settings
      .get()
      .then((settings) => {
        const workspaces = settings?.workspaces ?? []
        setWorkspaceCount(workspaces.length)
      })
      .catch(() => setWorkspaceCount(0))
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0f1117',
        color: '#e8eaed',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#2a2f3a',
          borderBottomStyle: 'solid'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <text style={{ fontSize: 18, fontWeight: 600 }}>Orca</text>
          <text style={{ fontSize: 12, color: '#9aa3b2' }}>GPUIX desktop host · v{version}</text>
        </div>
        <div
          style={{
            backgroundColor: '#1e3a5f',
            borderRadius: 6,
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 4,
            paddingBottom: 4
          }}
        >
          <text style={{ fontSize: 11, color: '#7dd3fc' }}>Electron-free</text>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          gap: 16,
          padding: 24
        }}
      >
        <text style={{ fontSize: 14, color: '#c4cad4' }}>
          Orca is running on GPUIX (Zed GPUI + React). The full Electron renderer is being migrated
          to native GPUIX components incrementally.
        </text>

        {error ? (
          <div
            style={{
              backgroundColor: '#3f1d1d',
              borderRadius: 8,
              padding: 12
            }}
          >
            <text style={{ color: '#fca5a5', fontSize: 13 }}>Backend error: {error}</text>
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 12
          }}
        >
          <StatusCard label="Profile" value={identity?.name ?? '…'} />
          <StatusCard
            label="Workspaces"
            value={workspaceCount === null ? '…' : String(workspaceCount)}
          />
          <StatusCard label="Runtime" value="GPUIX" />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            backgroundColor: '#161b22',
            borderRadius: 8,
            padding: 16
          }}
        >
          <text style={{ fontSize: 13, fontWeight: 600 }}>Migration status</text>
          <text style={{ fontSize: 12, color: '#9aa3b2' }}>
            ✓ Node backend + in-process IPC bridge
          </text>
          <text style={{ fontSize: 12, color: '#9aa3b2' }}>
            ✓ GPUIX native window + React reconciler
          </text>
          <text style={{ fontSize: 12, color: '#9aa3b2' }}>
            ○ Terminal (xterm → native terminal view)
          </text>
          <text style={{ fontSize: 12, color: '#9aa3b2' }}>
            ○ Embedded browser (WebView replacement)
          </text>
          <text style={{ fontSize: 12, color: '#9aa3b2' }}>
            ○ Full UI shell (Tailwind/shadcn → GPUIX primitives)
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
        padding: 12,
        minWidth: 120,
        flexGrow: 1
      }}
    >
      <text style={{ fontSize: 11, color: '#9aa3b2' }}>{label}</text>
      <text style={{ fontSize: 15, fontWeight: 500 }}>{value}</text>
    </div>
  )
}
