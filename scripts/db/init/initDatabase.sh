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
    # Apply compatible migrations (curated list)
    for migration in \
        scripts/db/migration/visibility_mode.sql \
        scripts/db/migration/calendar_notifications.sql \
        scripts/db/migration/parking_notifications.sql \
        scripts/db/migration/parking_request_locale.sql \
        scripts/db/migration/user_locale.sql \
        scripts/db/migration/set_user_locale_default_de.sql \
        scripts/db/migration/booking_settings.sql \
        scripts/db/migration/parking_reservation_status.sql \
        scripts/db/migration/parking_spot_features.sql \
        scripts/db/migration/workstation_equipment_fields.sql; do
        if [ -f "$migration" ]; then
            rel_path="${migration#scripts/db/}"
            scripts/db/exec_db.sh "$rel_path"
        fi
    done
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
    # Insert test users: admins, employees, and service personnel.
    scripts/db/exec_db.sh init/insertTestUsers.sql
else
    echo "Bye"
fi
