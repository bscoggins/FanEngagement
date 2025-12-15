#!/usr/bin/env bash
# run-all-tests.sh: Run every automated test suite (backend, frontend, e2e)
#
# Usage:
#   ./scripts/run-all-tests.sh
#
# This script is a thin orchestrator that first runs all unit tests (backend +
# frontend) and then executes the full Playwright E2E workflow. It relies on
# the existing helper scripts in ./scripts/ so any logic/details stay
# centralized there.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

UNIT_SCRIPT="./scripts/run-tests.sh"
# GOV_SCRIPT="./scripts/run-solana-governance-tests.sh"
E2E_SCRIPT="./scripts/run-e2e.sh"

if [[ ! -x $UNIT_SCRIPT ]]; then
  echo "Error: $UNIT_SCRIPT is missing or not executable." >&2
  exit 1
fi

if [[ ! -x $E2E_SCRIPT ]]; then
  echo "Error: $E2E_SCRIPT is missing or not executable." >&2
  exit 1
fi

# if [[ ! -x $GOV_SCRIPT ]]; then
#   echo "Error: $GOV_SCRIPT is missing or not executable." >&2
#   exit 1
# fi

# Ensure a clean slate before starting
echo "Cleaning up any existing Docker services..."
docker compose --profile "*" down --remove-orphans >/dev/null 2>&1 || true

# echo "=== [1/3] Governance program build + unit tests ==="
# $GOV_SCRIPT

cleanup() {
  echo "Stopping all Docker services..."
  docker compose --profile "*" down --remove-orphans || true
}
trap cleanup EXIT

# echo -e "\n=== Starting Solana Services for Integration Tests ==="
# docker compose --profile solana up -d solana-test-validator solana-adapter

# echo "Waiting for Solana services to be healthy..."
# # Wait for validator
# for i in {1..30}; do
#   if docker compose exec -T solana-test-validator solana cluster-version >/dev/null 2>&1; then
#     echo "Validator is ready."
#     break
#   fi
#   echo "Waiting for validator... ($i/30)"
#   sleep 2
# done

# # Wait for adapter
# for i in {1..30}; do
#   if curl -s http://localhost:3001/v1/adapter/health >/dev/null; then
#     echo "Adapter is ready."
#     break
#   fi
#   echo "Waiting for adapter... ($i/30)"
#   sleep 2
# done

# echo "Funding adapter wallet..."
# # Devnet public key corresponding to the default dev private key
# ADAPTER_PUBKEY="2p7ji7RTkmNJTEHwd7mRkiscmZXFETHavtYyNJMyLzcg"
# for i in {1..5}; do
#   if docker compose exec -T solana-test-validator solana airdrop 10 "$ADAPTER_PUBKEY" --url http://localhost:8899; then
#     echo "Airdrop succeeded."
#     break
#   fi
#   echo "Airdrop failed, retrying... ($i/5)"
#   sleep 5
# done

echo -e "\n=== [2/3] Backend + Frontend Unit Suites ==="
$UNIT_SCRIPT

echo -e "\n=== [3/3] Playwright E2E Suite ==="
$E2E_SCRIPT

echo -e "\n✓ All automated tests passed."
