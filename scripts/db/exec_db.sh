#!/bin/bash
. ./.env
container=${DATABASE_CONTAINER}
PW_DB=$(cat ${PATH_TO_TLS}/pws/pw_db.txt)
echo "Connect to ${container}"
#docker exec -it ${container} db.sh
if [ -z "$1" ]; then
    docker exec -it ${container} mariadb -p${PW_DB} mydatabase
    #docker exec -it ${container} mariadb -p${PW_DB} mydatabase $1
else 
    if [ -f "scripts/db/$1" ]; then
        docker exec -i ${container} mariadb -p${PW_DB} mydatabase < scripts/db/$1
    else
        echo "Error: File 'scripts/db/$1' not found!"
        exit 1
    fi
fi