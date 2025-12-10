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
E2E_SCRIPT="./scripts/run-e2e.sh"

if [[ ! -x $UNIT_SCRIPT ]]; then
  echo "Error: $UNIT_SCRIPT is missing or not executable." >&2
  exit 1
fi

if [[ ! -x $E2E_SCRIPT ]]; then
  echo "Error: $E2E_SCRIPT is missing or not executable." >&2
  exit 1
fi

echo "=== [1/2] Backend + Frontend Unit Suites ==="
$UNIT_SCRIPT

echo "\n=== [2/2] Playwright E2E Suite ==="
$E2E_SCRIPT

echo "\n✓ All automated tests passed."
