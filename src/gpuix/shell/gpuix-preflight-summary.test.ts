import { describe, expect, it } from 'vitest'
import { formatPreflightSummary } from './gpuix-preflight-summary'

describe('formatPreflightSummary', () => {
  it('formats missing tools', () => {
    expect(
      formatPreflightSummary({
        git: { installed: false },
        gh: { installed: false, authenticated: false }
      })
    ).toBe('git missing · gh missing')
  })

  it('formats authenticated gh', () => {
    expect(
      formatPreflightSummary({
        git: { installed: true },
        gh: { installed: true, authenticated: true }
      })
    ).toBe('git ok · gh auth')
  })
})
