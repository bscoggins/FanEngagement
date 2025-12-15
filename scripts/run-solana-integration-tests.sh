#!/usr/bin/env bash
# run-solana-integration-tests.sh: Run backend integration tests with Solana adapter
#
# Usage:
#   ./scripts/run-solana-integration-tests.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Starting Solana Services ==="
docker compose --profile solana up -d solana-adapter

echo "Waiting for services to initialize..."
sleep 10

echo "=== Running Integration Tests ==="
# Use the test-backend script logic or call dotnet test directly
# Calling dotnet test directly to ensure we are in the right folder
cd backend/FanEngagement.Tests
dotnet test --filter "Category=SolanaIntegration"

echo "=== Tests Completed ==="
