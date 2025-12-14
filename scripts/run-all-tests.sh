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
GOV_SCRIPT="./scripts/run-solana-governance-tests.sh"
E2E_SCRIPT="./scripts/run-e2e.sh"

if [[ ! -x $UNIT_SCRIPT ]]; then
  echo "Error: $UNIT_SCRIPT is missing or not executable." >&2
  exit 1
fi

if [[ ! -x $E2E_SCRIPT ]]; then
  echo "Error: $E2E_SCRIPT is missing or not executable." >&2
  exit 1
fi

if [[ ! -x $GOV_SCRIPT ]]; then
  echo "Error: $GOV_SCRIPT is missing or not executable." >&2
  exit 1
fi

echo "=== [1/3] Governance program build + unit tests ==="
$GOV_SCRIPT

echo -e "\n=== [2/3] Backend + Frontend Unit Suites ==="
$UNIT_SCRIPT

echo -e "\n=== [3/3] Playwright E2E Suite ==="
$E2E_SCRIPT

echo -e "\n✓ All automated tests passed."
