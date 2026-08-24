#!/usr/bin/env bash
# Orca Cloud Agent bootstrap: pin Node 24 (package.json "engines") via nvm, then
# install workspace dependencies. Idempotent — safe to re-run on every build/boot.
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm not found at $NVM_DIR; installing nvm" >&2
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"

# Why: the exec daemon prepends its own Node 22 to PATH in non-login shells, so
# `nvm use` here guarantees the toolchain runs on Node 24 regardless of caller.
nvm install 24
nvm alias default 24
nvm use 24

corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@10.24.0 --activate >/dev/null 2>&1 || true

node -v
pnpm -v

# node-pty and other native modules are rebuilt by the repo's postinstall.
pnpm install --frozen-lockfile
