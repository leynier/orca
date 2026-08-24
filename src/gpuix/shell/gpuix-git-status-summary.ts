import type { GitStatusResult } from '../../shared/git-status-types'

export function formatGitStatusSummary(status: GitStatusResult | null): string {
  if (!status) {
    return 'no status'
  }
  const branch = status.branch ?? 'detached'
  const changes = status.entries.length
  const upstream = status.upstreamStatus
  const sync = upstream?.hasUpstream ? ` ↑${upstream.ahead} ↓${upstream.behind}` : ''
  return `${branch} · ${changes} change${changes === 1 ? '' : 's'}${sync}`
}
