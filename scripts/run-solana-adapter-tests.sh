#!/usr/bin/env bash
# run-solana-adapter-tests.sh: Spin up a Solana local validator, fund the adapter test keypair,
# and execute the Solana adapter's unit + integration test suites.
#
# Usage:
#   ./scripts/run-solana-adapter-tests.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ADAPTER_DIR="$ROOT_DIR/adapters/solana"
COMPOSE_FILE="$ADAPTER_DIR/docker-compose.yml"
KEYPAIR_FILE="${SOLANA_TEST_KEYPAIR:-$ROOT_DIR/test-keypair.json}"
RPC_URL="${SOLANA_RPC_URL:-http://localhost:8899}"
COMPOSE_STARTED=0

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: Required command '$1' is not installed or not in PATH." >&2
    exit 1
  fi
}

cleanup() {
  if [[ $COMPOSE_STARTED -eq 1 ]]; then
    echo -e "\nStopping Solana validator and cleaning up..."
    docker compose -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT
trap 'exit 1' INT

require_cmd docker
require_cmd solana
require_cmd solana-keygen
require_cmd npm

if [[ ! -d $ADAPTER_DIR ]]; then
  echo "Error: Solana adapter directory not found at $ADAPTER_DIR" >&2
  exit 1
fi

if [[ ! -f $COMPOSE_FILE ]]; then
  echo "Error: docker-compose.yml not found at $COMPOSE_FILE" >&2
  exit 1
fi

echo "Starting solana-test-validator via Docker Compose..."
docker compose -f "$COMPOSE_FILE" up -d solana-test-validator >/dev/null
COMPOSE_STARTED=1

# Wait for validator to respond
validator_ready=false
for attempt in {1..15}; do
  if solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
    echo "Solana validator is ready (attempt $attempt)."
    validator_ready=true
    break
  fi
  echo "Waiting for Solana validator (attempt $attempt/15)..."
  sleep 2
done

if [[ $validator_ready == false ]]; then
  echo "Error: Timed out waiting for solana-test-validator to become healthy." >&2
  exit 1
fi

if [[ ! -f $KEYPAIR_FILE ]]; then
  echo "Generating test keypair at $KEYPAIR_FILE..."
  solana-keygen new --outfile "$KEYPAIR_FILE" --no-bip39-passphrase >/dev/null
fi

PUBKEY="$(solana-keygen pubkey "$KEYPAIR_FILE")"
echo "Funding adapter keypair ($PUBKEY) via airdrop..."
if ! solana airdrop 2 "$PUBKEY" --url "$RPC_URL" >/dev/null 2>&1; then
  echo "Error: Unable to airdrop SOL to $PUBKEY. Tests will likely fail without funded accounts." >&2
  exit 1
fi

solana balance "$PUBKEY" --url "$RPC_URL" || true

pushd "$ADAPTER_DIR" >/dev/null

if [[ ! -d node_modules ]]; then
  echo "Installing npm dependencies..."
  npm install
fi

export SOLANA_RPC_URL="$RPC_URL"
export SOLANA_NETWORK="${SOLANA_NETWORK:-localnet}"
export SOLANA_PRIVATE_KEY="$(tr -d '\n' < "$KEYPAIR_FILE")"
export API_KEY="${SOLANA_ADAPTER_API_KEY:-dev-api-key-change-in-production}"

echo -e "\nRunning Solana adapter unit tests..."
npm test

echo -e "\nRunning Solana adapter integration tests..."
npm run test:integration

popd >/dev/null

echo -e "\nSolana adapter tests completed successfully."
