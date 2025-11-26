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
  docker compose down
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
docker compose run --rm e2e
