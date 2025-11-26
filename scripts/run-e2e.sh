#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_HEALTH_URL="http://localhost:8080/health/live"
FRONTEND_URL="http://localhost:3000"

cd "$ROOT_DIR"

echo "Starting database, API, and frontend via Docker Compose (rebuilding to pick up latest frontend/UI changes)..."
docker compose up -d --build db api frontend

cleanup() {
  echo "Stopping Compose services..."
  # Best-effort stop/remove any lingering Playwright-related containers first
  docker rm -f fanengagement-e2e >/dev/null 2>&1 || true
  docker rm -f fanengagement-playwright-mcp >/dev/null 2>&1 || true
  # Bring down the compose stack and remove orphans so the network can be cleaned up
  docker compose down --remove-orphans || true
}

trap cleanup EXIT

echo "Waiting for API to become healthy..."
api_ready=false
for attempt in {1..30}; do
  if curl -sf "$API_HEALTH_URL" >/dev/null; then
    api_ready=true
    break
  fi
  echo "API not ready yet (attempt $attempt). Retrying in 2s..."
  sleep 2
done

if [[ "$api_ready" == false ]]; then
  echo "API did not become healthy in time." >&2
  exit 1
fi

echo "Waiting for frontend to become ready..."
frontend_ready=false
for attempt in {1..30}; do
  if curl -sf "$FRONTEND_URL" >/dev/null; then
    frontend_ready=true
    break
  fi
  echo "Frontend not ready yet (attempt $attempt). Retrying in 2s..."
  sleep 2
done

if [[ "$frontend_ready" == false ]]; then
  echo "Frontend did not become ready in time." >&2
  exit 1
fi

echo "Running Playwright E2E suite inside Docker..."
set +e
docker compose --profile e2e run --rm e2e
E2E_EXIT_CODE=$?
set -e

if [[ $E2E_EXIT_CODE -eq 0 ]]; then
  echo "E2E passed. Cleaning up E2E test data..."
  # Obtain admin token
  LOGIN_PAYLOAD='{"email":"admin@example.com","password":"Admin123!"}'
  LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8080/auth/login" -H 'Content-Type: application/json' -d "$LOGIN_PAYLOAD")

  TOKEN=""
  if command -v jq >/dev/null 2>&1; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')
  else
    # Fallback: naive grep/sed extraction if jq is unavailable
    TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"token"\s*:\s*"\([^"]*\)".*/\1/p')
  fi

  if [[ -z "$TOKEN" ]]; then
    echo "Warning: Could not parse token from login response. Skipping cleanup." >&2
  else
    CLEANUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:8080/admin/cleanup-e2e-data" -H "Authorization: Bearer $TOKEN")
    if [[ "$CLEANUP_STATUS" == "200" ]]; then
      echo "Cleanup request completed."
    else
      echo "Cleanup request failed with status $CLEANUP_STATUS" >&2
      # Print response body for debugging
      curl -s -X POST "http://localhost:8080/admin/cleanup-e2e-data" -H "Authorization: Bearer $TOKEN" >&2
    fi
  fi
else
  echo "E2E failed (exit $E2E_EXIT_CODE). Preserving test data for debugging."
  exit $E2E_EXIT_CODE
fi
