#!/usr/bin/env bash
# run-solana-governance-tests.sh: Build and test the Solana governance program
#
# Usage:
#   ./scripts/run-solana-governance-tests.sh
#
# This script builds the governance program (Anchor) and runs its Rust unit
# and integration tests. It assumes Anchor and the Solana CLI are installed and
# on PATH. It sources the cargo environment to ensure rustup binaries are available.
#
# To run the validator via docker-compose instead of the local binary, set:
#   SOLANA_VALIDATOR_MODE=docker

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
PROGRAM_DIR="$ROOT_DIR/adapters/solana_legacy/program"

if [[ -f "$HOME/.cargo/env" ]]; then
  # shellcheck source=/dev/null
  source "$HOME/.cargo/env"
fi

if ! command -v anchor >/dev/null 2>&1; then
  echo "Error: anchor CLI not found on PATH. Install via cargo or ensure ~/.cargo/bin is exported." >&2
  exit 1
fi

if ! command -v solana >/dev/null 2>&1; then
  echo "Warning: solana CLI not found on PATH. Build may fail if the toolchain is missing." >&2
fi

# Ensure any prior docker validator instances are stopped to free RPC ports
docker compose -f "$ROOT_DIR/adapters/solana_legacy/docker-compose.yml" down >/dev/null 2>&1 || true

cleanup() {
  # Shut down dockerized validator if it was started
  docker compose -f "$ROOT_DIR/adapters/solana_legacy/docker-compose.yml" down >/dev/null 2>&1 || true
}
trap cleanup EXIT

cd "$PROGRAM_DIR"

echo "=== Building governance program (anchor build) ==="
anchor build

echo "=== Running governance Rust unit tests (cargo test -p fan-governance) ==="
cargo test -p fan-governance

echo "=== Deploy/install check on solana-test-validator ==="
"$ROOT_DIR/adapters/solana_legacy/scripts/run-solana-governance-validator.sh"

# Optional end-to-end on a Docker validator: deploy, then run live RPC-based flow test against the running chain
echo "=== Running governance end-to-end flow against dockerized solana-test-validator ==="
export SOLANA_VALIDATOR_MODE=docker
export VALIDATOR_PAYER_OUT="$PROGRAM_DIR/target/tmp/validator-payer.json"
export KEEP_VALIDATOR_ALIVE=1
"$ROOT_DIR/adapters/solana_legacy/scripts/run-solana-governance-validator.sh"

LIVE_RPC_URL="http://127.0.0.1:${RPC_PORT:-8899}"
# Ensure the saved validator payer exists and is funded before running the live test
PAYER_PUBKEY=$(solana-keygen pubkey "$VALIDATOR_PAYER_OUT")
for _ in {1..5}; do
  docker exec solana-test-validator solana --url http://localhost:8899 airdrop 5 "$PAYER_PUBKEY" >/dev/null || true
  BALANCE=$(solana --url "$LIVE_RPC_URL" --keypair "$VALIDATOR_PAYER_OUT" balance 2>/dev/null || echo "0")
  if [[ "$BALANCE" != "0 SOL" && -n "$BALANCE" ]]; then
    echo "Docker validator payer balance: $BALANCE"
    break
  fi
  sleep 1
done
export RUN_LIVE_VALIDATOR_TEST=1
export SOLANA_RPC_URL="$LIVE_RPC_URL"
export SOLANA_PAYER_KEYPAIR="$VALIDATOR_PAYER_OUT"
cargo test -p fan-governance live_validator_flow

echo -e "\n✓ Governance program build, unit tests, and validator install check finished successfully."
