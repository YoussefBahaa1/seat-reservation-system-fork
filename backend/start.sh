export PW_TLS=$(cat /run/secrets/PW_TLS)
export PW_DB=$(cat /run/secrets/PW_DB)
export LDAP_DIR_CONTEXT_PASSWORD=$(cat /run/secrets/PW_LDAP)
exec java -Djava.net.preferIPv4Stack=true -jar backend-0.0.1-SNAPSHOT.jar