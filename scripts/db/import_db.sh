#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: import_db.sh <dumpfile>"
    echo "Eg: scripts/db/import_db.sh bookings_03.sql"
    exit
fi
dumpfile="$1"
database="mydatabase"
. .env
. ./scripts/db/common.sh
container="$(resolve_database_container)"
if [ -z "${container}" ]; then
    echo "Could not resolve database container. Start containers first."
    exit 1
fi
PW_DB=$(cat "${PATH_TO_TLS}/pws/pw_db.txt")
echo "Connect to ${container}"
docker exec -i "${container}" mariadb -p"${PW_DB}" "${database}" < "dumps/$dumpfile"
