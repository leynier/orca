import type { EventPayload } from '@gpuix/native'

const SPECIAL_KEYS: Record<string, string> = {
  enter: '\r',
  backspace: '\x7f',
  tab: '\t',
  escape: '\x1b',
  up: '\x1b[A',
  down: '\x1b[B',
  right: '\x1b[C',
  left: '\x1b[D',
  delete: '\x1b[3~',
  home: '\x1b[H',
  end: '\x1b[F',
  pageup: '\x1b[5~',
  pagedown: '\x1b[6~'
}

/** Maps a GPUIX keyDown payload to bytes for node-pty. */
export function gpuixKeyEventToTerminalInput(event: EventPayload): string | null {
  if (event.eventType !== 'keyDown') {
    return null
  }

  const key = event.key?.toLowerCase()
  if (!key) {
    return null
  }

  const special = SPECIAL_KEYS[key]
  if (special) {
    return special
  }

  if (event.keyChar && event.keyChar.length === 1) {
    return event.keyChar
  }

  if (key.length === 1) {
    return key
  }

  return null
}
