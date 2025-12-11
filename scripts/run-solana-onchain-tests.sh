#!/usr/bin/env bash
# run-solana-onchain-tests.sh: Launch a local Solana validator + adapter and execute
# the opt-in on-chain integration tests that verify proposals and votes are
# recorded on the blockchain.
#
# Usage:
#   ./scripts/run-solana-onchain-tests.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ADAPTER_DIR="$ROOT_DIR/adapters/solana"
COMPOSE_FILE="$ADAPTER_DIR/docker-compose.yml"
KEYPAIR_FILE="${SOLANA_TEST_KEYPAIR:-$ROOT_DIR/test-keypair.json}"
RPC_URL="${SOLANA_RPC_URL:-http://localhost:8899}"
ADAPTER_HEALTH_URL="${SOLANA_ADAPTER_HEALTH_URL:-http://localhost:3001/v1/adapter/health}"
ADAPTER_BASE_URL="${SOLANA_ADAPTER_BASE_URL:-http://localhost:3001/v1/adapter/}" # used by backend config
ADAPTER_API_KEY="${SOLANA_ADAPTER_API_KEY:-dev-api-key-change-in-production}"
AIRDROP_AMOUNT_SOL="${SOLANA_AIRDROP_AMOUNT:-25}"
COMPOSE_STARTED=0

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: Required command '$1' is not installed or not in PATH." >&2
    exit 1
  fi
}

cleanup() {
  local exit_status=$?
  if [[ $COMPOSE_STARTED -eq 1 ]]; then
    echo -e "\nStopping Solana adapter stack..."
    if ! docker compose -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1; then
      echo "Warning: Failed to stop Docker Compose services" >&2
    fi
  fi

  # Keep the local environment tidy between runs.
  if ! docker container prune -f >/dev/null 2>&1; then
    echo "Warning: Failed to prune Docker containers" >&2
  fi
  # WARNING: This prunes ALL dangling images system-wide, not just those from this test run.
  # This affects all Docker projects on the developer's machine.
  if ! docker image prune -f >/dev/null 2>&1; then
    echo "Warning: Failed to prune Docker images" >&2
  fi
  
  exit $exit_status
}

trap cleanup EXIT
trap 'exit 1' INT

require_cmd docker
require_cmd solana
require_cmd solana-keygen
require_cmd dotnet
require_cmd curl

if [[ ! -d $ADAPTER_DIR ]]; then
  echo "Error: Solana adapter directory not found at $ADAPTER_DIR" >&2
  exit 1
fi

if [[ ! -f $COMPOSE_FILE ]]; then
  echo "Error: docker-compose.yml not found at $COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f $KEYPAIR_FILE ]]; then
  echo "Generating Solana test keypair at $KEYPAIR_FILE..."
  solana-keygen new --outfile "$KEYPAIR_FILE" --no-bip39-passphrase >/dev/null
fi

# Warn if keypair file permissions are too permissive
if [[ -f "$KEYPAIR_FILE" ]]; then
  KEYPAIR_PERMS=$(stat -c '%a' "$KEYPAIR_FILE" 2>/dev/null || stat -f '%OLp' "$KEYPAIR_FILE" 2>/dev/null)
  if [[ "$KEYPAIR_PERMS" != "600" && "$KEYPAIR_PERMS" != "400" ]]; then
    echo "WARNING: Keypair file $KEYPAIR_FILE has permissions $KEYPAIR_PERMS. Consider using 'chmod 600 $KEYPAIR_FILE' to restrict access."
  fi
fi

PUBKEY="$(solana-keygen pubkey "$KEYPAIR_FILE")"
SOLANA_PRIVATE_KEY_CONTENT="$(tr -d '\n' <"$KEYPAIR_FILE")"

export SOLANA_ADAPTER_API_KEY="$ADAPTER_API_KEY"
export SOLANA_ADAPTER_BASE_URL="$ADAPTER_BASE_URL"
export SOLANA_ON_CHAIN_RPC_URL="$RPC_URL"
export SOLANA_ADAPTER_PUBKEY="$PUBKEY"
export RUN_SOLANA_ON_CHAIN_TESTS=true

echo "Ensuring any previous Solana adapter stack is stopped..."
SOLANA_PRIVATE_KEY="$SOLANA_PRIVATE_KEY_CONTENT" API_KEY="$ADAPTER_API_KEY" docker compose -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
docker rm -f solana-test-validator solana-adapter >/dev/null 2>&1 || true
docker container prune -f >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true

pushd "$ADAPTER_DIR" >/dev/null

echo "Starting local Solana validator and adapter..."
SOLANA_PRIVATE_KEY="$SOLANA_PRIVATE_KEY_CONTENT" API_KEY="$ADAPTER_API_KEY" docker compose -f "$COMPOSE_FILE" up -d solana-test-validator solana-adapter >/dev/null
COMPOSE_STARTED=1

popd >/dev/null

validator_ready=false
for attempt in {1..20}; do
  if solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
    echo "Solana validator is ready (attempt $attempt)."
    validator_ready=true
    break
  fi
  echo "Waiting for Solana validator (attempt $attempt/20)..."
  sleep 2
done

if [[ $validator_ready == false ]]; then
  echo "Error: solana-test-validator did not become healthy in time." >&2
  exit 1
fi

echo "Funding adapter signer $PUBKEY with ${AIRDROP_AMOUNT_SOL} SOL on local validator..."
airdrop_success=false
for attempt in {1..5}; do
  if solana airdrop "$AIRDROP_AMOUNT_SOL" "$PUBKEY" --url "$RPC_URL" >/dev/null 2>&1; then
    airdrop_success=true
    echo "SOL airdrop succeeded (attempt $attempt)."
    break
  fi
  echo "Airdrop attempt $attempt failed; retrying..."
  sleep 2
done

if [[ $airdrop_success == false ]]; then
  echo "Error: Unable to fund adapter keypair via solana airdrop." >&2
  exit 1
fi

adapter_balance=$(solana balance "$PUBKEY" --url "$RPC_URL" 2>/dev/null || true)
if [[ -n "$adapter_balance" ]]; then
  echo "Adapter signer balance: $adapter_balance"
fi

adapter_ready=false
for attempt in {1..30}; do
  if curl -fsS "$ADAPTER_HEALTH_URL" >/dev/null; then
    echo "Solana adapter is healthy (attempt $attempt)."
    adapter_ready=true
    break
  fi
  echo "Waiting for Solana adapter health (attempt $attempt/30)..."
  sleep 2
done

if [[ $adapter_ready == false ]]; then
  echo "Error: Solana adapter health endpoint did not become ready." >&2
  exit 1
fi

pushd "$ROOT_DIR" >/dev/null

echo -e "\nRunning Solana on-chain integration tests..."
dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --filter FullyQualifiedName~SolanaOnChainEndToEndTests "$@"

popd >/dev/null

echo -e "\nSolana on-chain tests completed successfully."
