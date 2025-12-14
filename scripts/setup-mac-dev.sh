#!/usr/bin/env bash
# setup-mac-dev.sh: Bootstrap a macOS workstation for FanEngagement development.
# Safe to re-run; installs required toolchains and restores project dependencies.
#
# What it does:
# - Verifies macOS and Homebrew
# - Installs: Xcode CLT (if needed), node@20, npm (via node), pnpm, rustup/cargo, solana CLI,
#   Anchor CLI (0.32.x), .NET SDK (via Homebrew cask), jq, watchman
# - Restores repo dependencies (npm installs and dotnet restore)
#
# Usage:
#   ./scripts/setup-mac-dev.sh

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This setup script is intended for macOS." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

have_cmd() { command -v "$1" >/dev/null 2>&1; }

ensure_homebrew() {
  if have_cmd brew; then
    return
  fi
  cat <<'EOF' >&2
Homebrew is required but not found.
Install Homebrew first, then re-run this script:
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
EOF
  exit 1
}

install_xcode_clt() {
  if /usr/bin/xcode-select -p >/dev/null 2>&1; then
    return
  fi
  echo "Installing Xcode Command Line Tools..."
  xcode-select --install || true
  echo "If prompted, complete the installer and re-run this script."
}

brew_install() {
  local formula="$1"
  if brew list "$formula" >/dev/null 2>&1; then
    return
  fi
  brew install "$formula"
}

brew_cask_install() {
  local cask="$1"
  if brew list --cask "$cask" >/dev/null 2>&1; then
    return
  fi
  brew install --cask "$cask"
}

install_node() {
  if have_cmd node && node -v | grep -q '^v20'; then
    return
  fi
  brew_install node@20
  brew link --overwrite --force node@20
}

install_pnpm() {
  if have_cmd pnpm; then
    return
  fi
  if ! have_cmd npm; then
    echo "Error: npm not found. Please ensure Node.js is installed first."
    return 1
  fi
  npm install -g pnpm
}

install_rustup() {
  if have_cmd rustup; then
    return
  fi
  echo "Installing rustup (Rust toolchain)..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
}

install_solana_cli() {
  if have_cmd solana; then
    return
  fi
  echo "Installing Solana CLI..."
  sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
}

install_anchor() {
  if have_cmd anchor; then
    return
  fi
  # Ensure cargo is available (sourced via $HOME/.cargo/env before this function is called)
  if ! have_cmd cargo; then
    echo "Error: cargo not found. Please ensure rustup is installed and sourced first."
    return 1
  fi
  echo "Installing Anchor CLI 0.32.x..."
  cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.32.1
}

install_dotnet() {
  if have_cmd dotnet; then
    return
  fi
  echo "Installing .NET SDK (via Homebrew cask)..."
  brew_cask_install dotnet-sdk
}

restore_repo_dependencies() {
  echo "Restoring repository dependencies..."
  (cd "$ROOT_DIR/frontend" && npm install)
  (cd "$ROOT_DIR/adapters/shared" && npm install)
  (cd "$ROOT_DIR/adapters/polygon" && npm install)
  (cd "$ROOT_DIR/adapters/solana" && npm install)
  (cd "$ROOT_DIR/backend" && dotnet restore FanEngagement.sln)
}

print_next_steps() {
  cat <<'EOF'
Setup complete.
Next steps:
1) Start the stack: ./scripts/dev-up --full
2) Run all tests:   ./scripts/run-all-tests.sh
3) Governance only: ./scripts/run-solana-governance-tests.sh
EOF
}

echo "=== FanEngagement macOS setup ==="
ensure_homebrew
install_xcode_clt
brew update
brew_install jq
brew_install watchman
install_node
install_pnpm
install_rustup
# shellcheck source=/dev/null
if [[ -f "$HOME/.cargo/env" ]]; then
  source "$HOME/.cargo/env"
fi
install_solana_cli
install_anchor
install_dotnet
restore_repo_dependencies
print_next_steps
