#/bin/bash
. ./.env
#docker stop ${DATABASE_CONTAINER} ${BACKEND_CONTAINER} ${FRONTEND_CONTAINER}
docker compose stop