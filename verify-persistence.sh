#!/bin/bash
set -e

echo "================================================"
echo "Postgres Data Persistence Verification Script"
echo "================================================"
echo ""

# Step 1: Clean up any existing containers (but preserve volumes)
echo "Step 1: Cleaning up existing containers..."
docker compose down
echo "✓ Cleanup complete"
echo ""

# Step 2: Start the stack and wait for database to be healthy
echo "Step 2: Starting the stack and waiting for database to be healthy..."
docker compose up -d --wait db
echo "✓ Database is ready"
echo ""

# Step 3: Create test data
echo "Step 3: Creating test data via the database..."
docker exec fanengagement-db psql -U fanengagement -d fanengagement -c \
  "CREATE TABLE IF NOT EXISTS persistence_test (
    id SERIAL PRIMARY KEY, 
    test_data TEXT, 
    created_at TIMESTAMP DEFAULT NOW()
  );"
docker exec fanengagement-db psql -U fanengagement -d fanengagement -c \
  "INSERT INTO persistence_test (test_data) VALUES ('Data created at ' || NOW());"
echo "✓ Test data created"
echo ""

# Step 4: Verify data exists
echo "Step 4: Verifying data exists..."
docker exec fanengagement-db psql -U fanengagement -d fanengagement -c \
  "SELECT * FROM persistence_test;"
echo "✓ Data verified"
echo ""

# Step 5: Stop and remove containers (but keep volumes)
echo "Step 5: Stopping and removing containers with 'docker compose down'..."
docker compose down
echo "✓ Containers stopped and removed"
echo ""

# Step 6: Verify volume still exists
echo "Step 6: Verifying Docker volume still exists..."
if docker volume ls | grep -q fanengagement_db_data; then
  echo "✓ Volume 'fanengagement_db_data' still exists"
else
  echo "✗ Volume not found!"
  exit 1
fi
echo ""

# Step 7: Start the stack again
echo "Step 7: Starting the stack again with 'docker compose up -d --wait db'..."
docker compose up -d --wait db
echo "✓ Stack restarted"
echo ""

# Step 8: Verify data persisted
echo "Step 8: Verifying data persisted after restart..."
DATA_COUNT=$(docker exec fanengagement-db psql -U fanengagement -d fanengagement -t -c \
  "SELECT COUNT(*) FROM persistence_test;" | tr -d '[:space:]')
if [ "$DATA_COUNT" -gt 0 ]; then
  echo "✓ Data persisted! Found $DATA_COUNT row(s):"
  docker exec fanengagement-db psql -U fanengagement -d fanengagement -c \
    "SELECT * FROM persistence_test;"
else
  echo "✗ Data not found!"
  exit 1
fi
echo ""

echo "================================================"
echo "✓ VERIFICATION COMPLETE - Data persists correctly!"
echo "================================================"
echo ""
echo "Cleanup: Run 'docker compose down -v' to remove volumes when done testing."
