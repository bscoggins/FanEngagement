#!/bin/bash
# E2E Test Runner Script for FanEngagement
#
# This script helps set up and run E2E tests for the FanEngagement application.
# It starts the required services and runs the Playwright E2E tests.
#
# Usage:
#   ./scripts/run-e2e-tests.sh          # Run E2E tests headless
#   ./scripts/run-e2e-tests.sh --headed # Run E2E tests in headed mode
#   ./scripts/run-e2e-tests.sh --ui     # Run E2E tests in UI mode (interactive)
#   ./scripts/run-e2e-tests.sh --help   # Show help
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - Node.js 20+ installed
#   - npm installed
#
# The script will:
#   1. Start database and API via Docker Compose
#   2. Wait for services to be healthy
#   3. Install frontend dependencies if needed
#   4. Run the E2E tests
#   5. Optionally tear down services after tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default values
PLAYWRIGHT_ARGS=""
TEARDOWN=false
SKIP_DOCKER=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      PLAYWRIGHT_ARGS="--headed"
      shift
      ;;
    --ui)
      PLAYWRIGHT_ARGS="--ui"
      shift
      ;;
    --teardown)
      TEARDOWN=true
      shift
      ;;
    --skip-docker)
      SKIP_DOCKER=true
      shift
      ;;
    --help|-h)
      echo "E2E Test Runner for FanEngagement"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --headed      Run tests in headed browser mode"
      echo "  --ui          Run tests in Playwright UI mode (interactive)"
      echo "  --teardown    Tear down Docker services after tests"
      echo "  --skip-docker Skip Docker service startup (use if services are already running)"
      echo "  --help, -h    Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                     # Run headless E2E tests"
      echo "  $0 --headed            # Run tests with browser visible"
      echo "  $0 --ui                # Interactive mode for debugging"
      echo "  $0 --teardown          # Clean up after tests"
      echo ""
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FanEngagement E2E Test Runner${NC}"
echo -e "${GREEN}========================================${NC}"

# Change to project root
cd "$PROJECT_ROOT"

# Function to wait for API to be healthy
wait_for_api() {
  echo -e "${YELLOW}Waiting for API to be healthy...${NC}"
  local max_attempts=30
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
      echo -e "${GREEN}API is healthy!${NC}"
      return 0
    fi
    echo "  Attempt $attempt/$max_attempts - waiting..."
    sleep 2
    attempt=$((attempt + 1))
  done
  
  echo -e "${RED}API failed to become healthy after $max_attempts attempts${NC}"
  return 1
}

# Start Docker services if not skipped
if [ "$SKIP_DOCKER" = false ]; then
  echo -e "${YELLOW}Starting Docker services (db and api)...${NC}"
  docker compose up -d db api
  
  # Wait for database to be healthy
  echo -e "${YELLOW}Waiting for database to be healthy...${NC}"
  for i in {1..30}; do
    cid=$(docker compose ps -q db 2>/dev/null || true)
    if [ -n "$cid" ]; then
      status=$(docker inspect -f '{{json .State.Health.Status}}' "$cid" 2>/dev/null || echo '"starting"')
      if [ "$status" = '"healthy"' ]; then
        echo -e "${GREEN}Database is healthy!${NC}"
        break
      fi
    fi
    echo "  Waiting for database... (attempt $i/30)"
    sleep 2
  done
  
  # Wait for API to be healthy
  wait_for_api
fi

# Install frontend dependencies if needed
cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing frontend dependencies...${NC}"
  npm ci
fi

# Install Playwright browsers if needed
echo -e "${YELLOW}Checking Playwright browsers...${NC}"
if ! npx playwright install chromium --with-deps 2>/dev/null; then
  echo -e "${YELLOW}--with-deps option not available, installing chromium only...${NC}"
  npx playwright install chromium
fi

# Run E2E tests
echo -e "${GREEN}Running E2E tests...${NC}"
echo ""

# Set the base URL to point to Docker Compose frontend or direct to API
export E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:5173}"

if [ -n "$PLAYWRIGHT_ARGS" ]; then
  npm run e2e -- "$PLAYWRIGHT_ARGS"
else
  npm run e2e
fi

TEST_EXIT_CODE=$?

# Teardown if requested
if [ "$TEARDOWN" = true ]; then
  echo -e "${YELLOW}Tearing down Docker services...${NC}"
  cd "$PROJECT_ROOT"
  docker compose down -v
fi

# Exit with test result code
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}E2E Tests Passed!${NC}"
  echo -e "${GREEN}========================================${NC}"
else
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}E2E Tests Failed!${NC}"
  echo -e "${RED}========================================${NC}"
fi

exit $TEST_EXIT_CODE
