#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cleanup() {
    echo "Ctrl+C gedrückt. Führe 'docker compose down' aus..."
    docker compose down
    exit 0
}


trap cleanup SIGINT

cd "${REPO_ROOT}"

# Source .env
. .env

# Fallback to local checkout paths when .env contains machine-specific defaults.
if [ -z "${PROJECT_PATH:-}" ] || [ ! -d "${PROJECT_PATH}" ]; then
    PROJECT_PATH="${REPO_ROOT}"
fi

if [ -z "${PATH_TO_TLS:-}" ] || [ ! -d "${PATH_TO_TLS}" ]; then
    PATH_TO_TLS="${PROJECT_PATH}/tls"
fi

BACKEND_LOGS="${PROJECT_PATH}/backend/logs_dev_backend/"
export PROJECT_PATH PATH_TO_TLS BACKEND_LOGS

if [ ! -f "${PATH_TO_TLS}/pws/pw_db.txt" ]; then
    echo "Missing DB password file: ${PATH_TO_TLS}/pws/pw_db.txt" >&2
    exit 1
fi

# DB Password
export PW_DB=$(cat $PATH_TO_TLS/pws/pw_db.txt)
export MARIADB_ROOT_PASSWORD=$(cat $PATH_TO_TLS/pws/pw_db.txt)

# Check if tls is activated. 
# If so we like to set the frontend container port to 443.
# Otherwise we set it to 80 (non tls)
if [ "$USE_TLS" = "true" ]; then
  export FRONTEND_CONTAINER_PORT=443
  export PROTOCOLL=https
else
  export FRONTEND_CONTAINER_PORT=80
  export PROTOCOLL=http
fi

# Create logs dir if not exist.
mkdir -p backend/logs_dev_backend/

if [ "${NO_CACHE:-false}" = "true" ]; then
  DOCKER_BUILDKIT=1 docker compose --env-file .env build --no-cache \
      --build-arg CACHEBUST="$(date +%s)" \
      --build-arg http_proxy="${http_proxy-}" \
      --build-arg https_proxy="${https_proxy-}"
else
  DOCKER_BUILDKIT=1 docker compose --env-file .env build \
      --build-arg CACHEBUST="$(date +%s)" \
      --build-arg http_proxy="${http_proxy-}" \
      --build-arg https_proxy="${https_proxy-}"
fi


docker compose up --force-recreate


echo "Skript beendet. Führe 'docker compose down' aus..."
docker compose down
