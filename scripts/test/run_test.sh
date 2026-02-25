#!/bin/sh

# Resolve repo root so the script works regardless of current working directory.
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
CYPRESS_DIR="$REPO_ROOT/cypress"
CYPRESS_IMAGE="${CYPRESS_IMAGE:-cypress/included:12.14.0}"
CYPRESS_VERIFY_TIMEOUT="${CYPRESS_VERIFY_TIMEOUT:-120000}"

# Load env from repo root
. "$REPO_ROOT/.env"

PROTOCOL="http"
if [ "$USE_TLS" = "true" ]; then
    PROTOCOL="https"
fi

CYPRESS_BASE_URL="${PROTOCOL}://${IP}:${FRONTEND_PORT}"

if [ -z "$1" ]; then
    # No argument provided, default command
    docker run \
    -e no_proxy="backend,frontend,backend:8080,jus-srv-test30.justiz.sachsen.de, jus-srv-test30.justiz.sachsen.de:8082" \
    -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
    -e CYPRESS_VERIFY_TIMEOUT="${CYPRESS_VERIFY_TIMEOUT}" \
    -e TEST_USER_PW="${TEST_USER_PW}" \
    -e TEST_ADMIN_PW="${TEST_ADMIN_PW}" \
    -e TEST_USER_MAIL="${TEST_USER_MAIL}" \
    -e TEST_ADMIN_MAIL="${TEST_ADMIN_MAIL}" \
    -e CYPRESS_BASE_URL="${CYPRESS_BASE_URL}" \
    -e CYPRESS_baseUrl="${CYPRESS_BASE_URL}" \
    --network host \
    --ipc=host \
    -it -v "$CYPRESS_DIR:/e2e" -w /e2e \
    "${CYPRESS_IMAGE}" \
    --quiet
else
    # Argument provided, include it in the command
    docker run \
    -e no_proxy="backend,frontend,backend:8080,jus-srv-test30.justiz.sachsen.de, jus-srv-test30.justiz.sachsen.de:8082" \
    -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
    -e CYPRESS_VERIFY_TIMEOUT="${CYPRESS_VERIFY_TIMEOUT}" \
    -e TEST_USER_PW="${TEST_USER_PW}" \
    -e TEST_ADMIN_PW="${TEST_ADMIN_PW}" \
    -e TEST_USER_MAIL="${TEST_USER_MAIL}" \
    -e TEST_ADMIN_MAIL="${TEST_ADMIN_MAIL}" \
    -e CYPRESS_BASE_URL="${CYPRESS_BASE_URL}" \
    -e CYPRESS_baseUrl="${CYPRESS_BASE_URL}" \
    --network host \
    --ipc=host \
    -it -v "$CYPRESS_DIR:/e2e" -w /e2e \
    "${CYPRESS_IMAGE}" \
    --quiet \
    --spec "cypress/integration/$1"
fi
