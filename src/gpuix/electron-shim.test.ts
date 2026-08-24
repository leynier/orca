import { describe, expect, it } from 'vitest'
import { ipcMain, ipcRenderer, gpuixWebContents } from '../main/gpuix/electron-shim-core'

describe('gpuix electron shim', () => {
  it('routes invoke through registered handlers', async () => {
    ipcMain.handle('test:ping', (_event, value: unknown) => ({ ok: true, value }))
    const result = await ipcRenderer.invoke('test:ping', 'orca')
    expect(result).toEqual({ ok: true, value: 'orca' })
  })

  it('routes send to main listeners and send to renderer listeners separately', () => {
    const mainEvents: string[] = []
    const rendererEvents: string[] = []
    ipcMain.on('test:to-main', () => mainEvents.push('main'))
    ipcRenderer.on('test:to-renderer', () => rendererEvents.push('renderer'))
    ipcRenderer.send('test:to-main')
    expect(mainEvents).toEqual(['main'])
    expect(rendererEvents).toEqual([])
    gpuixWebContents.send('test:to-renderer')
    expect(rendererEvents).toEqual(['renderer'])
  })

  it('routes sendSync through on listeners with returnValue', () => {
    ipcMain.on('test:sync', (event) => {
      event.returnValue = 'sync-ok'
    })
    expect(ipcRenderer.sendSync('test:sync')).toBe('sync-ok')
  })
})
