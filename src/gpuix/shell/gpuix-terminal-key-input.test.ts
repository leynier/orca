import { describe, expect, it } from 'vitest'
import { gpuixKeyEventToTerminalInput } from './gpuix-terminal-key-input'

describe('gpuixKeyEventToTerminalInput', () => {
  it('maps printable characters', () => {
    expect(
      gpuixKeyEventToTerminalInput({ elementId: 1, eventType: 'keyDown', key: 'a', keyChar: 'a' })
    ).toBe('a')
  })

  it('maps special keys', () => {
    expect(gpuixKeyEventToTerminalInput({ elementId: 1, eventType: 'keyDown', key: 'enter' })).toBe(
      '\r'
    )
    expect(
      gpuixKeyEventToTerminalInput({ elementId: 1, eventType: 'keyDown', key: 'backspace' })
    ).toBe('\x7f')
  })

  it('ignores non-keyDown events', () => {
    expect(gpuixKeyEventToTerminalInput({ elementId: 1, eventType: 'click', key: 'a' })).toBeNull()
  })
})
