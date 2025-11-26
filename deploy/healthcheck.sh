#!/bin/sh
# Health check script that extracts port from ASPNETCORE_URLS and checks the /health/live endpoint
# This ensures the healthcheck works regardless of whether the port is 80, 8080, or any other value

# Default values
DEFAULT_PORT=8080
HEALTH_HOST="${HEALTH_HOST:-127.0.0.1}"

# Handle empty or unset ASPNETCORE_URLS
if [ -z "$ASPNETCORE_URLS" ]; then
  PORT=$DEFAULT_PORT
else
  # Extract the first URL if multiple are specified (separated by semicolon)
  FIRST_URL=$(echo "$ASPNETCORE_URLS" | cut -d';' -f1)

  # Extract port from the first URL using a more specific pattern
  # Matches: protocol://host:port (captures only the port from the host portion)
  PORT=$(echo "$FIRST_URL" | sed -E 's|^[^:]+://[^:/]+:([0-9]+).*|\1|')

  # Check if the extraction was successful (PORT should be different from FIRST_URL and numeric)
  if [ "$PORT" = "$FIRST_URL" ] || [ -z "$PORT" ] || ! echo "$PORT" | grep -qE '^[0-9]+$'; then
    PORT=$DEFAULT_PORT
  fi
fi

# Perform the health check using the extracted port
# Use HEALTH_HOST (defaults to 127.0.0.1) for better container compatibility
HEALTH_URL="http://${HEALTH_HOST}:${PORT}/health/live"
curl -f "$HEALTH_URL" || {
  echo "Health check failed for $HEALTH_URL" >&2
  exit 1
}
