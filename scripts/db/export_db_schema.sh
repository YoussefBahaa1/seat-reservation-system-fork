#!/bin/bash
if [ $# -lt 1 ]; then
    echo "Usage: export_db_schema.sh <outptfile>"
    echo "Eg: export_db_schema.sh bookings_03.sql"
    exit
fi

outputfile="$1"

. .env
PW_DB=$(cat ${PATH_TO_TLS}/pws/pw_db.txt)
echo "Connect to ${DATABASE_CONTAINER}"
docker exec $DATABASE_CONTAINER mariadb-dump -u root -p${PW_DB} --no-data --databases mydatabase >>  dumps/$outputfile