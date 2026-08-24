import { EventEmitter } from 'node:events'
import type { GpuixWebContents, IpcHandler, IpcListener, IpcMainEvent } from './electron-shim-types'

const invokeHandlers = new Map<string, IpcHandler>()
const eventListeners = new Map<string, Set<IpcListener>>()

export const gpuixWebContents: GpuixWebContents = {
  id: 1,
  send(channel: string, ...args: unknown[]) {
    const listeners = eventListeners.get(channel)
    if (!listeners) {
      return
    }
    const event: IpcMainEvent = { sender: gpuixWebContents, frameId: 0 }
    for (const listener of listeners) {
      listener(event, ...args)
    }
  },
  isDestroyed: () => false
}

function makeInvokeEvent(): IpcMainEvent {
  return { sender: gpuixWebContents, frameId: 0 }
}

export const ipcMain = {
  handle(channel: string, handler: IpcHandler): void {
    invokeHandlers.set(channel, handler)
  },
  on(channel: string, listener: IpcListener): void {
    const set = eventListeners.get(channel) ?? new Set()
    set.add(listener)
    eventListeners.set(channel, set)
  },
  removeListener(channel: string, listener: IpcListener): void {
    eventListeners.get(channel)?.delete(listener)
  },
  removeHandler(channel: string): void {
    invokeHandlers.delete(channel)
  },
  removeAllListeners(channel?: string): void {
    if (channel) {
      eventListeners.delete(channel)
      return
    }
    eventListeners.clear()
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
    gpuixWebContents.send(channel, ...args)
  },
  sendSync(channel: string, ...args: unknown[]): unknown {
    const handler = invokeHandlers.get(channel)
    if (!handler) {
      throw new Error(`No IPC handler registered for channel: ${channel}`)
    }
    return handler(makeInvokeEvent(), ...args)
  },
  on(channel: string, listener: IpcListener): void {
    ipcMain.on(channel, listener)
  },
  removeListener(channel: string, listener: IpcListener): void {
    ipcMain.removeListener(channel, listener)
  }
}

export const appEmitter = new EventEmitter()
