#!/bin/bash
if [ $# -lt 1 ]; then
    echo "Usage: export_db.sh <outptfile>"
    echo "Eg: scripts/export_db.sh bookings_03.sql"
    exit
fi

outputfile="$1"

. .env
PW_DB=$(cat ${PATH_TO_TLS}/pws/pw_db.txt)
echo "Connect to ${DATABASE_CONTAINER}"
docker exec $DATABASE_CONTAINER mariadb-dump -u root -p${PW_DB} --databases mydatabase >>  dumps/$outputfile