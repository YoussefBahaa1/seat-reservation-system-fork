#!/bin/bash
if [ $# -lt 1 ]; then
    echo "Usage: export_db_schema.sh <outptfile>"
    echo "Eg: export_db_schema.sh bookings_03.sql"
    exit
fi

outputfile="$1"

. .env
. ./scripts/db/common.sh
container="$(resolve_database_container)"
if [ -z "${container}" ]; then
    echo "Could not resolve database container. Start containers first."
    exit 1
fi
PW_DB=$(cat "${PATH_TO_TLS}/pws/pw_db.txt")
echo "Connect to ${container}"
docker exec "${container}" mariadb-dump -u root -p"${PW_DB}" --no-data --databases mydatabase >> "dumps/$outputfile"
