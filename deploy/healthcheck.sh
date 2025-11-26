#!/bin/sh
# Health check script that extracts port from ASPNETCORE_URLS and checks the /health/live endpoint
# This ensures the healthcheck works regardless of whether the port is 80, 8080, or any other value

# Extract the first URL if multiple are specified (separated by semicolon)
FIRST_URL=$(echo "$ASPNETCORE_URLS" | cut -d';' -f1)

# Extract port from the first URL (e.g., "http://+:8080" -> "8080" or "http://0.0.0.0:80" -> "80")
# The regex looks for a colon followed by digits at the end of the URL
PORT=$(echo "$FIRST_URL" | sed -E 's/.*:([0-9]+)$/\1/')

# If PORT equals FIRST_URL, it means no port was extracted (no match found)
# If PORT is empty or not a number, default to 8080
if [ "$PORT" = "$FIRST_URL" ] || ! echo "$PORT" | grep -qE '^[0-9]+$'; then
  PORT=8080
fi

# Perform the health check using the extracted port
curl -f "http://localhost:${PORT}/health/live" || exit 1
