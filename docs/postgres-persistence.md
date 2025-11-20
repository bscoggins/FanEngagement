# Postgres Data Persistence Verification

## Overview

This document confirms that the Postgres database in the FanEngagement application is configured to persist data across container restarts using Docker volumes.

## Configuration

The `docker-compose.yml` file is configured with a named Docker volume for Postgres data persistence:

```yaml
services:
  db:
    image: postgres:16
    # ... other configuration ...
    volumes:
      - db_data:/var/lib/postgresql/data  # Named volume mapping

volumes:
  db_data:  # Named volume declaration
```

## How It Works

1. **Named Volume**: The `db_data` volume is defined in the top-level `volumes` section of `docker-compose.yml`
2. **Volume Mount**: The volume is mapped to `/var/lib/postgresql/data` in the Postgres container, which is the default data directory for PostgreSQL
3. **Persistence**: When containers are stopped with `docker compose down` (without the `-v` flag), the volume persists on the host
4. **Recovery**: When containers are restarted with `docker compose up`, they reconnect to the existing volume and all data is preserved

## Verification Steps

### Manual Verification

1. Start the stack:
   ```bash
   docker compose up -d
   ```

2. Create some test data:
   ```bash
   docker exec fanengagement-db psql -U fanengagement -d fanengagement -c \
     "CREATE TABLE test_data (id SERIAL PRIMARY KEY, value TEXT);"
   docker exec fanengagement-db psql -U fanengagement -d fanengagement -c \
     "INSERT INTO test_data (value) VALUES ('test');"
   ```

3. Verify data exists:
   ```bash
   docker exec fanengagement-db psql -U fanengagement -d fanengagement -c \
     "SELECT * FROM test_data;"
   ```

4. Stop and remove containers (but keep volumes):
   ```bash
   docker compose down
   ```

5. Verify volume still exists:
   ```bash
   docker volume ls | grep fanengagement_db_data
   ```

6. Start the stack again:
   ```bash
   docker compose up -d
   ```

7. Verify data persisted:
   ```bash
   docker exec fanengagement-db psql -U fanengagement -d fanengagement -c \
     "SELECT * FROM test_data;"
   ```

### Automated Verification

Run the provided verification script:

```bash
./verify-persistence.sh
```

This script will:
- Clean up any existing containers (preserves volumes)
- Start the database service
- Create test data
- Stop and remove containers
- Verify the volume persists
- Restart the database
- Verify the data is still present

**Note:** This script preserves any existing data in your database volumes. It only removes containers, not volumes.

## Important Notes

### Volume Persistence

- `docker compose down` - Stops and removes containers but **keeps volumes**
- `docker compose down -v` - Stops and removes containers **and removes volumes** (data will be lost)

### Volume Management

- List volumes: `docker volume ls`
- Inspect a volume: `docker volume inspect fanengagement_db_data`
- Remove a volume: `docker volume rm fanengagement_db_data` (only works when containers are stopped)

### Production Considerations

1. **Backups**: Even with persistent volumes, regular database backups are essential
2. **Volume Location**: Docker volumes are stored on the host system. Ensure adequate disk space
3. **Data Migration**: When moving to a new host, use `docker volume` export/import or database dump/restore
4. **Monitoring**: Monitor volume disk usage to prevent space issues

## Test Results

The verification script has been tested and confirms:

✓ Volume is created automatically when the stack starts  
✓ Data persists after `docker compose down`  
✓ Data is accessible after `docker compose up`  
✓ Configuration is compatible with existing environment variables and ports  

## Troubleshooting

### Volume Not Found

If the volume is missing after restart:
- Check if `docker compose down -v` was used (this removes volumes)
- Verify the volume name matches: `docker volume ls | grep fanengagement`

### Data Not Persisting

If data doesn't persist:
- Verify the volume is mapped correctly in `docker-compose.yml`
- Check Docker daemon logs for errors
- Ensure sufficient disk space for volumes

### Permission Issues

If permission errors occur:
- Postgres container runs as the `postgres` user
- Volume permissions are managed automatically by Docker
- Check container logs: `docker compose logs db`
