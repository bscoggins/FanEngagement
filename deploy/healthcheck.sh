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

  # Extract port from the first URL (e.g., "http://+:8080" -> "8080" or "http://0.0.0.0:80" -> "80")
  # The regex looks for a colon followed by digits at the end of the URL
  PORT=$(echo "$FIRST_URL" | sed -E 's/.*:([0-9]+)$/\1/')

  # If PORT equals FIRST_URL, it means no port was extracted (no match found)
  # If PORT is empty or not a number, default to 8080
  if [ "$PORT" = "$FIRST_URL" ] || ! echo "$PORT" | grep -qE '^[0-9]+$'; then
    PORT=$DEFAULT_PORT
  fi
fi

# Perform the health check using the extracted port
# Use HEALTH_HOST (defaults to 127.0.0.1) for better container compatibility
curl -f "http://${HEALTH_HOST}:${PORT}/health/live" || exit 1
