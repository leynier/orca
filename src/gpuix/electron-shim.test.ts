import { describe, expect, it } from 'vitest'
import { ipcMain, ipcRenderer } from '../main/gpuix/electron-shim'

describe('gpuix electron shim', () => {
  it('routes invoke through registered handlers', async () => {
    ipcMain.handle('test:ping', (_event, value: unknown) => ({ ok: true, value }))
    const result = await ipcRenderer.invoke('test:ping', 'orca')
    expect(result).toEqual({ ok: true, value: 'orca' })
  })
})
