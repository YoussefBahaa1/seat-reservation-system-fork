#!/bin/bash

# Resolve the running database container in a robust way:
# 1) Prefer the currently running compose service "database".
# 2) Fallback to DATABASE_CONTAINER from .env.
resolve_database_container() {
    local compose_container_id
    local compose_container_name

    compose_container_id="$(docker compose --env-file .env ps -q database 2>/dev/null | head -n 1)"
    if [ -n "${compose_container_id}" ]; then
        compose_container_name="$(docker ps --filter "id=${compose_container_id}" --format '{{.Names}}' | head -n 1)"
        if [ -n "${compose_container_name}" ]; then
            echo "${compose_container_name}"
        else
            echo "${compose_container_id}"
        fi
        return 0
    fi

    if [ -n "${DATABASE_CONTAINER:-}" ]; then
        echo "${DATABASE_CONTAINER}"
        return 0
    fi

    return 1
}
