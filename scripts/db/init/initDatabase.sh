#!/bin/bash

# Please run this script from the project root.

. ./.env
container=${DATABASE_CONTAINER}
echo "Connect to ${container}"
PW_DB=$(cat ${PATH_TO_TLS}/pws/pw_db.txt)
read -p "Push 'y' if you want to init the database in ${container}" answer
if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    # Create dumps/ dir if not existing.
    mkdir -p dumps/
    # Create new database
    docker exec -i ${container} mariadb -p${PW_DB} < scripts/db/init/createDatabase.sql
    # Load schema definitions.
    scripts/db/import_db.sh schema.sql
    # Insert viewmodes
    scripts/db/exec_db.sh init/insertViewModes.sql
    # Insert equipments
    scripts/db/exec_db.sh init/insertEquipment.sql
    # Insert roomstatuses
    scripts/db/exec_db.sh init/insertRoomStatuses.sql
    # Insert roles
    scripts/db/exec_db.sh init/insertRoles.sql
    # Insert room types.
    scripts/db/exec_db.sh init/insertRoomTypes.sql
    # Insert buzildings, floors, rooms and desks.
    scripts/db/exec_db.sh init/insertBuilding.sql
    # Insert test user and test admin.
    scripts/db/exec_db.sh init/insertTestUsers.sql
else
    echo "Bye"
fi