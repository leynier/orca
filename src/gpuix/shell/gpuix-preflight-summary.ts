import type { PreflightStatus } from '../../main/preflight/agent-detection'

export function formatPreflightSummary(status: PreflightStatus | null): string {
  if (!status) {
    return '…'
  }
  const git = status.git.installed ? 'git ok' : 'git missing'
  const gh = status.gh.installed
    ? status.gh.authenticated
      ? 'gh auth'
      : 'gh no auth'
    : 'gh missing'
  return `${git} · ${gh}`
}
