export type IpcHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
export type IpcListener = (event: IpcMainEvent, ...args: unknown[]) => void
export type WebContentsListener = (...args: unknown[]) => void

export type IpcMainInvokeEvent = {
  sender: GpuixWebContents
  frameId: number
  senderFrame?: GpuixWebContentsFrame
}

export type IpcMainEvent = IpcMainInvokeEvent & {
  returnValue?: unknown
}

export type GpuixWebContentsFrame = {
  readonly parent: GpuixWebContents
}

export type GpuixWebContents = {
  id: number
  mainFrame: GpuixWebContentsFrame
  send: (channel: string, ...args: unknown[]) => void
  isDestroyed: () => boolean
  on: (event: string, listener: WebContentsListener) => void
  removeListener: (event: string, listener: WebContentsListener) => void
}
