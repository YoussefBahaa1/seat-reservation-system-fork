. .env && ldapsearch -H "${LDAP_DIR_CONTEXT_URL}" \
    -D "${LDAP_DIR_CONTEXT_PRINCIPAL}" \
    -w "${LDAP_DIR_CONTEXT_PASSWORD}" \
    -b "${LDAP_ROLE_MAPPING_BASE}" \
    "(mail=$1)" memberOf