#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_HEALTH_URL="http://localhost:8080/health/live"
FRONTEND_URL="http://localhost:3000"

cd "$ROOT_DIR"

# Always load compose with our shared dev env vars when the file exists locally.
# In CI the workflow sets the env vars directly, so fall back to default compose invocation.
if [[ -f .env.development ]]; then
  echo "Using .env.development for docker compose overrides"
  COMPOSE_CMD=(docker compose --env-file .env.development)
else
  echo "Warning: .env.development not found; relying on process env vars"
  COMPOSE_CMD=(docker compose)
fi

echo "Starting database, API, and frontend via Docker Compose (rebuilding to pick up latest frontend/UI changes)..."
"${COMPOSE_CMD[@]}" up -d --build db api frontend

cleanup() {
  echo "Stopping Compose services..."
  # Best-effort stop/remove any lingering Playwright-related containers first
  # Remove any service or one-off containers whose names match our Playwright services
  docker ps -aq --filter "name=fanengagement-e2e" | xargs -r docker rm -f >/dev/null 2>&1 || true
  docker ps -aq --filter "name=fanengagement-playwright-mcp" | xargs -r docker rm -f >/dev/null 2>&1 || true
  # Remove any one-off containers created by `docker compose run e2e`
  "${COMPOSE_CMD[@]}" rm -f -s -v e2e >/dev/null 2>&1 || true
  # Bring down the compose stack and remove orphans so the network can be cleaned up
  "${COMPOSE_CMD[@]}" down --remove-orphans || true
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

# Reset dev data to ensure seed credentials/passwords match documentation
echo "Resetting development data to baseline..."
LOGIN_PAYLOAD='{"email":"admin@example.com","password":"Admin123!"}'
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8080/auth/login" -H 'Content-Type: application/json' -d "$LOGIN_PAYLOAD")

TOKEN=""
if command -v jq >/dev/null 2>&1; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')
else
  TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"token"\s*:\s*"\([^"]*\)".*/\1/p')
fi

if [[ -z "$TOKEN" ]]; then
  echo "Warning: Could not parse token for dev data reset. Continuing without reset." >&2
else
  RESET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:8080/admin/reset-dev-data" -H "Authorization: Bearer $TOKEN")
  if [[ "$RESET_STATUS" == "200" ]]; then
    echo "Development data reset complete."
  else
    echo "Warning: reset-dev-data returned status $RESET_STATUS" >&2
  fi
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
# Forward optional E2E_DEBUG from host if set, to toggle verbose logs in tests
"${COMPOSE_CMD[@]}" --profile e2e run --rm -e E2E_DEBUG e2e
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
    CLEANUP_RESPONSE=$(curl -s -o /dev/stderr -w "%{http_code}" -X POST "http://localhost:8080/admin/cleanup-e2e-data" -H "Authorization: Bearer $TOKEN")
    if [[ "$CLEANUP_RESPONSE" == "200" ]]; then
      echo "Cleanup request completed."
    else
      echo "Cleanup request failed with status $CLEANUP_RESPONSE" >&2
    fi
  fi
else
  echo "E2E failed (exit $E2E_EXIT_CODE). Preserving test data for debugging."
  exit $E2E_EXIT_CODE
fi
