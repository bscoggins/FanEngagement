#!/bin/bash

# cleanup-act.sh
# Cleans up Docker containers and networks left behind by 'act' (local GitHub Actions runner).

echo "Searching for 'act' containers..."
# Find containers starting with "act-"
containers=$(docker ps -a -q -f name=^act-)

if [ -n "$containers" ]; then
  echo "Found $(echo "$containers" | wc -l | xargs) 'act' containers. Removing..."
  docker rm -f $containers
  echo "Removed 'act' containers."
else
  echo "No 'act' containers found."
fi

echo "Searching for 'act' networks..."
# Find networks starting with "act-"
networks=$(docker network ls -q -f name=^act-)

if [ -n "$networks" ]; then
  echo "Found $(echo "$networks" | wc -l | xargs) 'act' networks. Removing..."
  docker network rm $networks
  echo "Removed 'act' networks."
else
  echo "No 'act' networks found."
fi

echo "Cleanup complete."
