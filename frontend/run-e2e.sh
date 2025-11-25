#!/bin/bash

# E2E Test Runner Script
# 
# This script runs E2E tests against the full stack (backend + frontend)
# using Docker Compose.
#
# Usage:
#   ./run-e2e.sh                 # Run all E2E tests
#   ./run-e2e.sh --headed        # Run with browser visible
#   ./run-e2e.sh --ui            # Run with Playwright UI mode
#   ./run-e2e.sh admin-flow      # Run specific test file
#   ./run-e2e.sh --teardown-only # Just tear down containers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Start containers
start_containers() {
    log_info "Starting containers with Docker Compose..."
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" up -d db api frontend
    
    log_info "Waiting for services to be healthy..."
    
    # Wait for database
    for i in {1..30}; do
        if docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U fanengagement > /dev/null 2>&1; then
            log_info "Database is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Wait for API
    for i in {1..30}; do
        if curl -s http://localhost:8080/health > /dev/null 2>&1; then
            log_info "API is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Wait for frontend
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            log_info "Frontend is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    log_info "All services are running"
}

# Stop containers
stop_containers() {
    log_info "Stopping containers..."
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" down -v
    log_info "Containers stopped"
}

# Run E2E tests
run_tests() {
    local extra_args=("$@")
    
    log_info "Running E2E tests..."
    cd "$PROJECT_ROOT/frontend"
    
    # Set environment variables for E2E tests
    export E2E_BASE_URL="http://localhost:3000"
    export E2E_NO_SERVER=true  # Don't start the Vite dev server, use Docker frontend
    
    # Install Playwright browsers if needed
    npx playwright install chromium
    
    # Run tests
    if [ ${#extra_args[@]} -gt 0 ]; then
        npx playwright test "${extra_args[@]}"
    else
        npx playwright test
    fi
}

# Main
main() {
    check_docker
    
    # Parse arguments
    if [ "$1" == "--teardown-only" ]; then
        stop_containers
        exit 0
    fi
    
    # Start containers
    start_containers
    
    # Run tests (pass all arguments through)
    run_tests "$@"
    TEST_EXIT_CODE=$?
    
    # Tear down if requested or on CI
    if [ -n "$CI" ] || [ "$TEARDOWN_AFTER" == "true" ]; then
        stop_containers
    fi
    
    exit $TEST_EXIT_CODE
}

main "$@"
