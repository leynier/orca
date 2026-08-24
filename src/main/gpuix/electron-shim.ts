/**
 * In-process Electron API shim for the GPUIX desktop host.
 */
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import type { AppEnvironment } from '../../shared/app-environment'
import { appEmitter, gpuixWebContents, ipcMain, ipcRenderer } from './electron-shim-core'

export { ipcMain, ipcRenderer } from './electron-shim-core'
export type { GpuixWebContents, IpcMainEvent, IpcMainInvokeEvent } from './electron-shim-types'

let appEnvironment: AppEnvironment | null = null

export function bindGpuixAppEnvironmentFromShim(environment: AppEnvironment): void {
  appEnvironment = environment
}

export const app = {
  getPath(name: string): string {
    if (!appEnvironment) {
      if (name === 'home') {
        return homedir()
      }
      if (name === 'temp') {
        return tmpdir()
      }
      return join(homedir(), '.orca')
    }
    return appEnvironment.getPath(name as Parameters<AppEnvironment['getPath']>[0])
  },
  getAppPath(): string {
    return appEnvironment?.getAppPath() ?? process.cwd()
  },
  getVersion(): string {
    return appEnvironment?.getVersion() ?? '0.0.0-gpuix'
  },
  isPackaged(): boolean {
    return appEnvironment?.isPackaged() ?? false
  },
  whenReady(): Promise<void> {
    return Promise.resolve()
  },
  on(event: string, listener: (...args: unknown[]) => void): void {
    appEmitter.on(event, listener)
  },
  once(event: string, listener: (...args: unknown[]) => void): void {
    appEmitter.once(event, listener)
  },
  exit(code = 0): void {
    appEnvironment?.exit(code)
  },
  quit(): void {
    appEnvironment?.exit(0)
  },
  getAppMetrics(): unknown[] {
    return appEnvironment?.getAppMetrics() ?? []
  },
  isReady(): boolean {
    return true
  },
  commandLine: {
    appendSwitch(): void {},
    hasSwitch(): boolean {
      return false
    },
    getSwitchValue(): string {
      return ''
    }
  },
  getName(): string {
    return 'Orca'
  },
  setName(): void {},
  dock: undefined,
  relaunch(): void {},
  requestSingleInstanceLock(): boolean {
    return true
  }
}

export const nativeTheme = {
  shouldUseDarkColors: true,
  themeSource: 'system' as const,
  on(): void {},
  off(): void {}
}

export const powerMonitor = {
  on(): void {},
  off(): void {}
}

export const session = {
  defaultSession: {
    cookies: { get: async () => [], set: async () => {} },
    setPermissionRequestHandler(): void {},
    webRequest: { onBeforeSendHeaders(): void {} }
  },
  fromPartition(): typeof session.defaultSession {
    return session.defaultSession
  }
}

export const webContents = {
  fromId(id: number): typeof gpuixWebContents | undefined {
    return id === gpuixWebContents.id ? gpuixWebContents : undefined
  },
  getAllWebContents(): (typeof gpuixWebContents)[] {
    return [gpuixWebContents]
  }
}

let gpuixMainWindowSingleton: GpuixBrowserWindow | null = null

export function getGpuixMainWindowSingleton(): GpuixBrowserWindow {
  if (!gpuixMainWindowSingleton) {
    gpuixMainWindowSingleton = new GpuixBrowserWindow()
  }
  return gpuixMainWindowSingleton
}

export class GpuixBrowserWindow {
  static fromWebContents(contents: typeof gpuixWebContents): GpuixBrowserWindow | undefined {
    const win = gpuixMainWindowSingleton
    return win && contents === gpuixWebContents ? win : undefined
  }
  static fromId(): undefined {
    return undefined
  }
  static getAllWindows(): GpuixBrowserWindow[] {
    return gpuixMainWindowSingleton ? [gpuixMainWindowSingleton] : []
  }
  webContents = gpuixWebContents
  id = 1
  isDestroyed(): boolean {
    return false
  }
  close(): void {}
  show(): void {}
  hide(): void {}
  focus(): void {}
  isFocused(): boolean {
    return true
  }
  isVisible(): boolean {
    return true
  }
  setBounds(): void {}
  getBounds(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: 1280, height: 800 }
  }
  on(): void {}
  once(): void {}
  removeListener(): void {}
}

/** Electron-compatible alias used by IPC handler modules. */
export const BrowserWindow = GpuixBrowserWindow

export const dialog = {
  showOpenDialog: async () => ({ canceled: true, filePaths: [] as string[] }),
  showSaveDialog: async () => ({ canceled: true, filePath: undefined }),
  showMessageBox: async () => ({ response: 0 })
}

export const shell = {
  openExternal: async () => {},
  openPath: async () => '',
  showItemInFolder(): void {}
}

export const Notification = class {
  static isSupported(): boolean {
    return false
  }
  show(): void {}
}

export const clipboard = {
  readText(): string {
    return ''
  },
  writeText(): void {}
}

export const Menu = {
  buildFromTemplate(): { popup(): void } {
    return { popup() {} }
  },
  setApplicationMenu(): void {}
}

export const screen = {
  getPrimaryDisplay(): { workAreaSize: { width: number; height: number } } {
    return { workAreaSize: { width: 1920, height: 1080 } }
  },
  getAllDisplays(): { workAreaSize: { width: number; height: number } }[] {
    return [{ workAreaSize: { width: 1920, height: 1080 } }]
  }
}

export const contextBridge = {
  exposeInMainWorld(): void {}
}

export const webFrame = {
  setZoomFactor(): void {},
  getZoomFactor(): number {
    return 1
  }
}

export const webUtils = {
  getPathForFile(): string {
    return ''
  }
}

export const crashReporter = {
  start(): void {}
}

export const safeStorage = {
  isEncryptionAvailable(): boolean {
    return false
  },
  encryptString(): Buffer {
    throw new Error('gpuix_safe_storage_unavailable')
  },
  decryptString(): string {
    throw new Error('gpuix_safe_storage_unavailable')
  }
}

export const net = {
  request(): { on(): void; end(): void } {
    return { on() {}, end() {} }
  }
}

export const systemPreferences = {
  isTrustedAccessibilityClient(): boolean {
    return false
  },
  getMediaAccessStatus(): string {
    return 'denied'
  }
}

export const nativeImage = {
  createFromPath(): { isEmpty(): boolean } {
    return { isEmpty: () => true }
  }
}

export const electronShim = {
  app,
  ipcMain,
  ipcRenderer,
  BrowserWindow,
  webContents,
  dialog,
  shell,
  Notification,
  clipboard,
  Menu,
  screen,
  contextBridge,
  webFrame,
  webUtils,
  crashReporter,
  safeStorage,
  net,
  nativeTheme,
  powerMonitor,
  session,
  systemPreferences,
  nativeImage
}
