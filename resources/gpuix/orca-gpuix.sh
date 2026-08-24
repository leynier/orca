#!/usr/bin/env bash
# Launcher for the GPUIX desktop host (Linux/macOS).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ORCA_VERSION="${ORCA_VERSION:-$(node -p "require('${ROOT}/package.json').version" 2>/dev/null || echo 0.0.0-gpuix)}"
exec node "${ROOT}/out/gpuix/orca-gpuix.js" "$@"
