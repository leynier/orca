import { EventEmitter } from 'node:events'
import type {
  GpuixWebContents,
  IpcHandler,
  IpcListener,
  IpcMainEvent,
  WebContentsListener
} from './electron-shim-types'

const invokeHandlers = new Map<string, IpcHandler>()
/** Renderer → main (`ipcMain.on`, `ipc.on` in PTY handlers). */
const mainEventListeners = new Map<string, Set<IpcListener>>()
/** Main → renderer (`ipcRenderer.on`). */
const rendererEventListeners = new Map<string, Set<IpcListener>>()
const webContentsEmitter = new EventEmitter()

const gpuixMainFrame: { parent: typeof gpuixWebContents } = { parent: null as never }

export const gpuixWebContents: GpuixWebContents = {
  id: 1,
  mainFrame: gpuixMainFrame,
  send(channel: string, ...args: unknown[]) {
    const listeners = rendererEventListeners.get(channel)
    if (!listeners) {
      return
    }
    const event: IpcMainEvent = { sender: gpuixWebContents, frameId: 0 }
    for (const listener of listeners) {
      listener(event, ...args)
    }
  },
  isDestroyed: () => false,
  on(event: string, listener: WebContentsListener): void {
    webContentsEmitter.on(event, listener)
  },
  removeListener(event: string, listener: WebContentsListener): void {
    webContentsEmitter.removeListener(event, listener)
  }
}

gpuixMainFrame.parent = gpuixWebContents

/** PTY handlers wait for did-finish-load before arming delivery gates. */
export function emitGpuixRendererDidFinishLoad(): void {
  webContentsEmitter.emit('did-finish-load')
}

function makeInvokeEvent(): IpcMainEvent {
  return { sender: gpuixWebContents, frameId: 0, senderFrame: gpuixWebContents.mainFrame }
}

export const ipcMain = {
  handle(channel: string, handler: IpcHandler): void {
    invokeHandlers.set(channel, handler)
  },
  on(channel: string, listener: IpcListener): void {
    const set = mainEventListeners.get(channel) ?? new Set()
    set.add(listener)
    mainEventListeners.set(channel, set)
  },
  removeListener(channel: string, listener: IpcListener): void {
    mainEventListeners.get(channel)?.delete(listener)
  },
  removeHandler(channel: string): void {
    invokeHandlers.delete(channel)
  },
  removeAllListeners(channel?: string): void {
    if (channel) {
      mainEventListeners.delete(channel)
      return
    }
    mainEventListeners.clear()
  }
}

export const ipcRenderer = {
  invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    const handler = invokeHandlers.get(channel)
    if (!handler) {
      return Promise.reject(new Error(`No IPC handler registered for channel: ${channel}`))
    }
    return Promise.resolve(handler(makeInvokeEvent(), ...args))
  },
  send(channel: string, ...args: unknown[]): void {
    const event = makeInvokeEvent()
    const listeners = mainEventListeners.get(channel)
    if (!listeners) {
      return
    }
    for (const listener of listeners) {
      listener(event, ...args)
    }
  },
  sendSync(channel: string, ...args: unknown[]): unknown {
    const handler = invokeHandlers.get(channel)
    if (handler) {
      return handler(makeInvokeEvent(), ...args)
    }
    const event = makeInvokeEvent()
    const listeners = mainEventListeners.get(channel)
    if (!listeners) {
      throw new Error(`No IPC handler registered for channel: ${channel}`)
    }
    for (const listener of listeners) {
      listener(event, ...args)
    }
    return event.returnValue
  },
  on(channel: string, listener: IpcListener): void {
    const set = rendererEventListeners.get(channel) ?? new Set()
    set.add(listener)
    rendererEventListeners.set(channel, set)
  },
  removeListener(channel: string, listener: IpcListener): void {
    rendererEventListeners.get(channel)?.delete(listener)
  },
  listenerCount(channel: string): number {
    return rendererEventListeners.get(channel)?.size ?? 0
  }
}

export const appEmitter = new EventEmitter()
