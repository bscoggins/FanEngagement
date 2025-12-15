#!/usr/bin/env bash
# run-solana-governance-validator.sh: Deploy the governance program to a local solana-test-validator and verify it is executable.
#
# Usage:
#   ./scripts/run-solana-governance-validator.sh
#
# Requirements: solana CLI, anchor CLI, built artifacts in adapters/solana/program/target/deploy (run anchor build first).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
PROGRAM_DIR="$ROOT_DIR/adapters/solana_legacy/program"
SO_PATH="$PROGRAM_DIR/target/deploy/fan_governance.so"
KEYPAIR_PATH="$PROGRAM_DIR/target/deploy/fan_governance-keypair.json"
PROGRAM_ID="53kLd3Zo8gqPyHuuALc1fLoARPszVkheA4P859MtfPo"
RPC_PORT=${RPC_PORT:-8899}
RPC_URL="http://127.0.0.1:${RPC_PORT}"
VALIDATOR_MODE=${SOLANA_VALIDATOR_MODE:-binary} # binary|docker
COMPOSE_FILE="$ROOT_DIR/adapters/solana_legacy/docker-compose.yml"
COMPOSE_SERVICE="solana-test-validator"

if [[ -f "$HOME/.cargo/env" ]]; then
  # shellcheck source=/dev/null
  source "$HOME/.cargo/env"
fi

if [[ ! -f "$SO_PATH" || ! -f "$KEYPAIR_PATH" ]]; then
  echo "Governance artifacts missing; running anchor build..."
  (cd "$PROGRAM_DIR" && anchor build)
fi

if [[ "$VALIDATOR_MODE" == "binary" ]]; then
  if ! command -v solana-test-validator >/dev/null 2>&1; then
    echo "Error: solana-test-validator not found on PATH. Set SOLANA_VALIDATOR_MODE=docker to use docker-compose." >&2
    exit 1
  fi
elif [[ "$VALIDATOR_MODE" == "docker" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Error: docker is required for SOLANA_VALIDATOR_MODE=docker." >&2
    exit 1
  fi
  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "Error: docker-compose file not found at $COMPOSE_FILE" >&2
    exit 1
  fi
else
  echo "Error: Unknown SOLANA_VALIDATOR_MODE='$VALIDATOR_MODE' (use binary|docker)." >&2
  exit 1
fi

LEDGER_DIR="$(mktemp -d)"
LOG_FILE="$(mktemp)"
TMP_PAYER="$(mktemp -u)"
CLEANUP_COMPOSE=false

# Optionally export the payer keypair used for deploys so callers can reuse it for follow-on tests
# Set VALIDATOR_PAYER_OUT to a writable file path.
VALIDATOR_PAYER_OUT=${VALIDATOR_PAYER_OUT:-}

# If set to 1, leave the validator running (useful for follow-on integration tests)
KEEP_VALIDATOR_ALIVE=${KEEP_VALIDATOR_ALIVE:-0}

cleanup() {
  if [[ "$VALIDATOR_MODE" == "binary" ]]; then
    if [[ -n "${VALIDATOR_PID:-}" ]]; then
      kill "$VALIDATOR_PID" >/dev/null 2>&1 || true
    fi
  elif [[ "$VALIDATOR_MODE" == "docker" && "$CLEANUP_COMPOSE" == "true" ]]; then
    docker compose -f "$COMPOSE_FILE" down >/dev/null 2>&1 || true
  fi
  rm -rf "$LEDGER_DIR"
  rm -f "$TMP_PAYER"
}
trap cleanup EXIT

# Ensure port is free
if lsof -i :"$RPC_PORT" >/dev/null 2>&1; then
  echo "Error: RPC port $RPC_PORT is already in use. Stop existing validators or set RPC_PORT env." >&2
  exit 1
fi

# Generate temporary payer for deploys
solana-keygen new --no-bip39-passphrase --silent --outfile "$TMP_PAYER" >/dev/null

# Optionally persist the payer keypair for downstream clients/tests
if [[ -n "$VALIDATOR_PAYER_OUT" ]]; then
  mkdir -p "$(dirname "$VALIDATOR_PAYER_OUT")"
  cp "$TMP_PAYER" "$VALIDATOR_PAYER_OUT"
fi

if [[ "$VALIDATOR_MODE" == "binary" ]]; then
  echo "Starting local solana-test-validator (binary mode)..."
  solana-test-validator \
    --reset \
    --ledger "$LEDGER_DIR" \
    --rpc-port "$RPC_PORT" \
    --faucet-port 9900 \
    --log \
    --bind-address 127.0.0.1 \
    --ticks-per-slot 8 \
    >"$LOG_FILE" 2>&1 &
  VALIDATOR_PID=$!
else
  echo "Starting solana-test-validator via docker-compose ($COMPOSE_FILE)..."
  docker compose -f "$COMPOSE_FILE" up -d "$COMPOSE_SERVICE"
  CLEANUP_COMPOSE=true
  # Capture logs for debugging
  docker compose -f "$COMPOSE_FILE" logs -f "$COMPOSE_SERVICE" >"$LOG_FILE" 2>&1 &
fi

# Wait for validator to be ready
for _ in {1..60}; do
  if solana --keypair "$TMP_PAYER" --url "$RPC_URL" cluster-version >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! solana --keypair "$TMP_PAYER" --url "$RPC_URL" cluster-version >/dev/null 2>&1; then
  echo "Validator did not start in time. See log: $LOG_FILE" >&2
  exit 1
fi

# Airdrop to payer to cover deploy fees (generous to avoid faucet flakiness)
solana --keypair "$TMP_PAYER" --url "$RPC_URL" airdrop 100 >/dev/null

# Deploy program
export SOLANA_TPU_CLIENT_DISABLED=${SOLANA_TPU_CLIENT_DISABLED:-1}
solana --keypair "$TMP_PAYER" --url "$RPC_URL" program deploy "$SO_PATH" --program-id "$KEYPAIR_PATH" --use-rpc >/dev/null

# Verify executable flag (JSON output for deterministic parsing)
SHOW_OUTPUT=$(solana --keypair "$TMP_PAYER" --url "$RPC_URL" program show "$PROGRAM_ID" --output json)

SHOW_JSON="$SHOW_OUTPUT" python3 - <<'PY'
import json, os, sys
data = json.loads(os.environ["SHOW_JSON"])
owner = data.get("owner", "")
is_exec = data.get("executable") is True or owner.startswith("BPFLoader")
sys.exit(0 if is_exec else 1)
PY
PY_STATUS=$?

if [[ $PY_STATUS -eq 0 ]]; then
  echo "✓ Governance program deployed and executable on test-validator ($RPC_URL)."
else
  echo "Program show did not report executable=true. Log: $LOG_FILE" >&2
  echo "Program show output:" >&2
  echo "$SHOW_OUTPUT" >&2
  exit 1
fi

# If caller wants validator left running, skip cleanup of docker compose
if [[ "$KEEP_VALIDATOR_ALIVE" == "1" ]]; then
  CLEANUP_COMPOSE=false
fi
