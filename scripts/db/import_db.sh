#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: import_db.sh <dumpfile>"
    echo "Eg: scripts/export_db.sh desksharingtool_dev-database-1 bookings_03.sql"
    exit
fi
dumpfile="$1"
database="mydatabase"
. .env
PW_DB=$(cat ${PATH_TO_TLS}/pws/pw_db.txt)
echo "Connect to ${container}"
cat dumps/$dumpfile | docker exec -i $DATABASE_CONTAINER mariadb -p${PW_DB}  $database