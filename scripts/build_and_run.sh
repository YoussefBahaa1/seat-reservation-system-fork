#!/bin/bash

cleanup() {
    echo "Ctrl+C gedrückt. Führe 'docker compose down' aus..."
    docker compose stop
    exit 0
}


trap cleanup SIGINT

# Source .env
. .env

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

DOCKER_BUILDKIT=1 docker compose --env-file .env build \
    --build-arg CACHEBUST=$(date +%s) \
    --build-arg http_proxy=$http_proxy \
    --build-arg https_proxy=$https_proxy


docker compose up


echo "Skript beendet. Führe 'docker compose down' aus..."
docker compose stop