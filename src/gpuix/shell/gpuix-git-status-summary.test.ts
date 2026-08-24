import { describe, expect, it } from 'vitest'
import { formatGitStatusSummary } from './gpuix-git-status-summary'

describe('formatGitStatusSummary', () => {
  it('formats branch and change count', () => {
    expect(
      formatGitStatusSummary({
        entries: [{ path: 'a.ts', status: 'modified', area: 'unstaged' }],
        conflictOperation: 'unknown'
      })
    ).toBe('detached · 1 change')
  })

  it('includes upstream sync counts', () => {
    expect(
      formatGitStatusSummary({
        entries: [],
        conflictOperation: 'unknown',
        branch: 'main',
        upstreamStatus: { hasUpstream: true, ahead: 2, behind: 1 }
      })
    ).toBe('main · 0 changes ↑2 ↓1')
  })
})
