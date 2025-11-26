#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_HEALTH_URL="http://localhost:8080/health/live"

cd "$ROOT_DIR"

echo "Starting database and API via Docker Compose..."
docker compose up -d db api

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

echo "Running Playwright E2E suite..."
cd "$ROOT_DIR/frontend"
VITE_API_BASE_URL="http://localhost:8080" npm run e2e
