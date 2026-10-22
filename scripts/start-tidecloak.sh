#!/usr/bin/env bash
# Start a local TideCloak dev server on :8080 (admin/password). Data persists in the "tidecloak-data" volume.
set -euo pipefail
IMAGE="${TIDECLOAK_IMAGE:-tideorg/tidecloak-dev:latest}"
if docker ps -a --format '{{.Names}}' | grep -qx mytidecloak; then
  docker start mytidecloak
else
  docker run -d --name mytidecloak -p 8080:8080 \
    -v tidecloak-data:/opt/keycloak/data/h2 \
    -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=password \
    "$IMAGE"
fi
echo "TideCloak starting on http://localhost:8080 (logs: docker logs -f mytidecloak)"
