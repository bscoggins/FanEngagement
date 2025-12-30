#!/usr/bin/env bash
# run-tests.sh: Run all unit tests (backend + frontend)
#
# Usage:
#   ./scripts/run-tests.sh             # Run backend then frontend unit tests
#   ./scripts/run-tests.sh --backend-only   # Run only backend unit tests
#   ./scripts/run-tests.sh --frontend-only  # Run only frontend unit tests
#
# For more granular control (watch mode, filters, etc.), invoke
# ./scripts/test-backend or ./scripts/test-frontend directly.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RUN_BACKEND=true
RUN_FRONTEND=true
RUN_ADAPTERS=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --backend-only)
      RUN_FRONTEND=false
      RUN_ADAPTERS=false
      shift
      ;;
    --frontend-only)
      RUN_BACKEND=false
      RUN_ADAPTERS=false
      shift
      ;;
    --adapters-only)
      RUN_BACKEND=false
      RUN_FRONTEND=false
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./scripts/run-tests.sh [options]

Options:
  --backend-only    Run only the backend unit tests
  --frontend-only   Run only the frontend unit tests
  --adapters-only   Run only the adapter unit tests
  -h, --help        Show this help message

This script simply orchestrates the existing test-backend, test-frontend,
and adapter test helpers. For additional flags (watch mode, filters, etc.)
run those scripts directly.
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Run ./scripts/run-tests.sh --help for usage." >&2
      exit 1
      ;;
  esac
done

if [[ "$RUN_BACKEND" == true ]]; then
  echo "=== Backend unit tests ==="
  ./scripts/test-backend
  echo ""
fi

if [[ "$RUN_FRONTEND" == true ]]; then
  echo "=== Frontend unit tests ==="
  ./scripts/test-frontend
  echo ""
fi

if [[ "$RUN_ADAPTERS" == true ]]; then
  echo "=== Adapter unit tests ==="
  ./scripts/test-solana-adapter
  echo ""
  ./scripts/test-polygon-adapter
  echo ""
  ./scripts/test-shared-adapter
  echo ""
fi

if [[ "$RUN_BACKEND" == false && "$RUN_FRONTEND" == false && "$RUN_ADAPTERS" == false ]]; then
  echo "No test suites selected. Use --backend-only, --frontend-only, or --adapters-only if needed." >&2
  exit 1
fi

echo "✓ All requested unit tests finished successfully."
