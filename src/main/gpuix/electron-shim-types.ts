export type IpcHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
export type IpcListener = (event: IpcMainEvent, ...args: unknown[]) => void

export type IpcMainInvokeEvent = {
  sender: GpuixWebContents
  frameId: number
}

export type IpcMainEvent = IpcMainInvokeEvent

export type GpuixWebContents = {
  id: number
  send: (channel: string, ...args: unknown[]) => void
  isDestroyed: () => boolean
}
