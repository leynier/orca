import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { setAppEnvironment, type AppEnvironment } from '../../shared/app-environment'
import { setSecretStore, type SecretStore } from '../../shared/secret-store'
import { bindGpuixAppEnvironmentFromShim } from './electron-shim'

function resolveUserDataPath(): string {
  const explicit = process.env.ORCA_USER_DATA
  if (explicit) {
    return explicit
  }
  const xdg = process.env.XDG_DATA_HOME
  return xdg ? join(xdg, 'Orca') : join(homedir(), '.orca')
}

function createGpuixAppEnvironment(): AppEnvironment {
  const userData = resolveUserDataPath()
  const quitHandlers: (() => void)[] = []
  const runQuitHandlers = (): void => {
    for (const handler of quitHandlers.splice(0)) {
      try {
        handler()
      } catch (error) {
        console.error('[gpuix] shutdown handler failed:', error)
      }
    }
  }
  process.once('SIGTERM', () => {
    runQuitHandlers()
    process.exit(0)
  })
  process.once('SIGINT', () => {
    runQuitHandlers()
    process.exit(0)
  })
  return {
    getPath: (name) => (name === 'home' ? homedir() : name === 'temp' ? tmpdir() : userData),
    getAppPath: () => process.cwd(),
    getVersion: () => process.env.ORCA_VERSION ?? '0.0.0-gpuix',
    isPackaged: () => false,
    onWillQuit: (handler) => quitHandlers.push(handler),
    exit: (code = 0) => process.exit(code),
    getAppMetrics: () => []
  }
}

function createGpuixSecretStore(): SecretStore {
  return {
    isEncryptionAvailable: () => false,
    encryptString: () => {
      throw new Error('gpuix_secret_sealing_unavailable')
    },
    decryptString: () => {
      throw new Error('gpuix_secret_sealing_unavailable')
    },
    describeProtectionGap: () =>
      'GPUIX host has no OS keyring integration yet; credentials are stored unencrypted.'
  }
}

export function installGpuixHostAdapters(): AppEnvironment {
  const environment = createGpuixAppEnvironment()
  setAppEnvironment(environment)
  bindGpuixAppEnvironmentFromShim(environment)
  setSecretStore(createGpuixSecretStore())
  return environment
}
