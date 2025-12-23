# Check if an argument is passed
. .env 
if [ -z "$1" ]; then
    # No argument provided, default command
    docker run \
    -e no_proxy="backend,frontend,backend:8080,jus-srv-test30.justiz.sachsen.de, jus-srv-test30.justiz.sachsen.de:8082" \
    -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
    -e TEST_USER_PW="${TEST_USER_PW}" \
    -e TEST_ADMIN_PW="${TEST_ADMIN_PW}" \
    -e TEST_USER_MAIL="${TEST_USER_MAIL}" \
    -e TEST_ADMIN_MAIL="${TEST_ADMIN_MAIL}" \
    --network host \
    -it -v /home/r/DeskSharingTool_Dev/cypress:/e2e -w /e2e \
    cypress/included:latest \
    --quiet
else
    # Argument provided, include it in the command
    docker run \
    -e no_proxy="backend,frontend,backend:8080,jus-srv-test30.justiz.sachsen.de, jus-srv-test30.justiz.sachsen.de:8082" \
    -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
    -e TEST_USER_PW="${TEST_USER_PW}" \
    -e TEST_ADMIN_PW="${TEST_ADMIN_PW}" \
    -e TEST_USER_MAIL="${TEST_USER_MAIL}" \
    -e TEST_ADMIN_MAIL="${TEST_ADMIN_MAIL}" \
    --network host \
    -it -v /home/r/DeskSharingTool_Dev/cypress:/e2e -w /e2e \
    cypress/included:latest \
    --quiet \
    --spec "cypress/integration/$1"
fi
