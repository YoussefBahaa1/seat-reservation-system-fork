# Desk-Sharing-Tool

Web application that allows to book workspaces in an office.

## Original project

`https://github.com/Gazzo-gif/Desk-Sharing-Tool`

## Before you can start

### First steps
- Clone this repo into a new folder: `git clone git@github.com:DaGeRe/seat-reservation-system.git`. We refer to the folder of the project as `$PROJECT_PATH`
- Configure the passwords; at least `tls/pws/pw_db.txt` needs to be set to your database password. For default passwords, use `mkdir -p tls/pws; echo "default" >> tls/pws/pw_db.txt; echo "empty" >> tls/pws/pw_ldap.txt; echo "empty" >> tls/pws/pw_tls.txt`
- Prepare the .env-file: `cp .env_template .env`; Set `PROJECT_PATH`, `PATH_TO_TLS`, and `IP` (your IP) to the relevant values; other than that, the default values can be used.
	* PROJECT_PATH must set to the absolute path of the root of our project.
	* PATH_TO_TLS must be set to the absolute path of the dir where we prior store our tls stuff and passwords.
	* IP must be set to the name/ip of our host machine.
- To start the containers, run `./scripts/build_and_run.sh`.
- After the containers are running, execute `./scripts/db/init/initDatabase.sh` to initialize the database with the default users.
After these steps, the desk-sharing-tool is initially running. Make sure to replace default passwords when running a public server. 

Afterwards, you can visit the project page (default `http://localhost:3001`). You can use the default credentials:
- **Admin**: test.admin@mail.de / test
- **Employee**: test.employee@mail.de / test
- **Service Personnel**: test.servicepersonnel@mail.de / test

(See [docs/DefaultTestUsers.md](docs/DefaultTestUsers.md) for a complete list of test accounts)


### TLS Configuration 
The TLS directory can be created wherever you like; by default, use `$PROJECT_PATH/tls`. We call this directory `$PATH_TO_TLS`
This directory later holds everything needed for tls/https communication. We write down the absolute path to this directory to add it later in the .env file as PATH_TO_TLS.
In the tls directory we first add an other directory called pws.

During the setup process you will execute bash scripts from the project root which are located in `$PROJECT_PATH/scripts`. If a error occurs execute the following statement: `chmod -R +x $PROJECT_PATH/scripts`.

In the next step we go further with the tls directory `$PATH_TO_TLS`

### TLS
Attention: later in .env we will see a flag called USE_TLS. Its default value is false, indicating that we dont want to use tls encryption. This means we dont have to do all the work described in this chapter. Anyway, the password files are still stored in the subfolder pws in the tls folder. So everytime an certificate file is mentioned ignore this if you set USE_TLS to false.

In order to use tls ask your CA for a server certificate. \
You can also create your own self signed cert. You need it in the .pfx format. \
Independent if you want to use TLS or not you have to create a folder to store all the (maybe needed) cert stuff and password files. The path to this folder is later stored in the parameter PATH_TO_TLS in .env. If you followed the previous step this directory already exists. \
Here you create the subfolder backend.

In `${PATH_TO_TLS}/backend` you add the pfx file. The name of this file is BACKEND_PFX_FILENAME in .env. To be sure you can create that directory even if you dont use TLS.

Create the folder `${PATH_TO_TLS}/frontend`. To be sure you can create that directory even if you dont use TLS. Here you store the crt file and the key file for the certificate (must be unencrypted). You can extract key- and certfile with openssl. These files are represented by `FRONTEND_KEY_FILE` and `FRONTEND_CRT_FILE` in .env.

To make sure no passwords are hard coded in the containers we also create the folder `${PATH_TO_TLS}/pws/`. This directory and its content is needed even if no TLS is used!

Here we create an file called pw_tls.txt. This file hase the password for our certifcation file as content. If no TLS is needed you can create an empty file with the specified name. (e.g. with `touch $PATH_TO_TLS/pws/pw_tls.txt`)

We also create `${PATH_TO_TLS}/pws/pw_db.txt` and `${PATH_TO_TLS}/pws/`pw_ldap.txt. These files contain the password for the database and for the service user of ldap. If ldap is not used it can be empty.

### Configure .env
`.env` is used to store parameters that are used to run the project. Some of them may be confidential or vary based on the environment. So some of them must be set by hand.

There are some variables that can change (but the default values from `.env_template` are fine):
* Network must be set either to mynetwork_dev or mynetwork. Both of them are defined in docker-compose.yml
* BACKEND_LOGS must be set to an directory where we like to store the logging messages. Choose a folder you like. E.g.: `${PROJECT_PATH}/backend/logs_dev_backend/`.
* VOLUME must set either to mariadb_data_dev or mariadb_data. Both are defined in docker-compose.yml.

Container names are fixed by `COMPOSE_PROJECT_NAME=seat-reservation-system` (default in `.env_template`) and `docker-compose.yml`.  
So the defaults `seat-reservation-system-frontend-1`, `seat-reservation-system-backend-1`, and `seat-reservation-system-database-1` remain stable even if the repository folder name changes (for example in forks).

Now we add the needed tls informations to .env.
Earlier we put our pfx TLS file in `PATH_TO_TLS/backend/`. Now we add the full name (with extension) of this .pfx file and write it in .env as BACKEND_PFX_FILENAME. Attention: you only need to do this if you you want to use TLS. 

Now we do a similiar thing regarding the frontend. Do a `ls $PATH_TO_TLS/frontend/` and you will see two files. The name of the file with the extension .crt is added to .env for FRONTEND_CRT_FILE. The file with the extension .key is added for FRONTEND_KEY_FILE. Attention: you only need to do this if you you want to use TLS. 

Check if the default values for FRONTEND_PORT, BACKEND_PORT and DATABASE_PORT matches your needs.

A list of all parameters from `.env_template` is in the following table:

| Parametername | Use | Example | Remarks |
|-----------|-------|--------------|--------------|
| PROJECT_PATH | The absolute path to the project on the host | /home/r/DesksharingTool_Dev | Needed |
| PATH_TO_TLS | The absolute path to the TLS/password folder | /home/r/tls | Needed |
| IP | The IP or hostname of the host machine | my-srv | Needed |
| COMPOSE_PROJECT_NAME | Docker Compose project name prefix | seat-reservation-system | Needed for stable container/network names across clones/forks |
| NETWORK | Docker network name used by this project | mynetwork_dev | Needed. One of the networks defined in `docker-compose.yml` |
| USE_TLS | Enable TLS mode | false | Needed |
| PROTOCOLL | Protocol used for generated backend URLs | http | Usually set by `scripts/build_and_run.sh` based on `USE_TLS` |
| LDAP_DIR_CONTEXT_URL | URL of the LDAP/AD server | ldaps://srv.de | Empty if LDAP is not used |
| LDAP_DIR_CONTEXT_PRINCIPAL | LDAP bind user | ldap_service_user,OU=Funktion,OU=AD-Management,DC=foo,DC=bar,DC=baz | Needed if LDAP is used |
| LDAP_USER_BASE | Base OU for user lookup | OU=org | Needed if LDAP is used |
| LDAP_USER_FILTER | LDAP filter for users | (&(objectClass=user)(mail={0})) | Needed if LDAP is used |
| LDAP_GROUP_BASE | Base OU for group lookup | Groups,OU=org | Needed if LDAP is used |
| LDAP_GROUP_FILTER | LDAP filter for groups | (distinguishedName={0}) | Needed if LDAP is used |
| LDAP_BASE | Base domain components | DC=org,DC=fs,DC=de | Needed if LDAP is used |
| ERROR_USER_NOT_FOUND_IN_AD | Frontend translation key for unknown AD user | ERROR_USER_NOT_FOUND_IN_AD | Needed |
| ERROR_USER_NOT_FOUND_IN_DAO | Frontend translation key for unknown DB user | ERROR_USER_NOT_FOUND_IN_DAO | Needed |
| ERROR_WRONG_PW | Frontend translation key for wrong password | ERROR_WRONG_PW | Needed |
| ERROR_USER_DEACTIVATED | Frontend translation key for deactivated user | ERROR_USER_DEACTIVATED | Needed |
| http_proxy | Proxy URL for HTTP | http://proxy.de:3128 | Optional |
| https_proxy | Proxy URL for HTTPS | http://proxy.de:3128 | Optional |
| TEST_USER_MAIL | Test employee email | test.employee@mail.de | Needed for tests |
| TEST_ADMIN_MAIL | Test admin email | test.admin@mail.de | Needed for tests |
| TEST_SERVICE_PERSONNEL_MAIL | Test service personnel email | test.servicepersonnel@mail.de | Needed for tests |
| TEST_USER_PW | Test employee password | test | Needed for tests |
| TEST_ADMIN_PW | Test admin password | test | Needed for tests |
| TEST_SERVICE_PERSONNEL_PW | Test service personnel password | test | Needed for tests |
| FRONTEND_TARGET | Frontend build target | production_runtime | Needed. Do not change unless you know why |
| FRONTEND_KEY_FILE | Frontend TLS key filename | frontend.key | Needed when TLS is enabled; file must exist in `$PATH_TO_TLS/frontend/` |
| FRONTEND_CRT_FILE | Frontend TLS cert filename | frontend.crt | Needed when TLS is enabled; file must exist in `$PATH_TO_TLS/frontend/` |
| CREATE_SERIES_DEFAULT_STARTTIME | Default series start time | 12:00:00 | Needed |
| CREATE_SERIES_DEFAULT_ENDTIME | Default series end time | 14:00:00 | Needed |
| CREATE_SERIES_DEFAULT_FREQUENCY | Default series frequency | daily | Needed |
| FRONTEND_PORT | Exposed frontend host port | 3001 | Needed |
| FRONTEND_CONTAINER_PORT | Internal frontend container port | 80 | Set by script: 80 for HTTP, 443 for TLS |
| FRONTEND_CONTAINER | Frontend container name | seat-reservation-system-frontend-1 | Stable by default via `COMPOSE_PROJECT_NAME` |
| REACT_APP_SUPPORT_ADMIN_EMAIL | Admin contact shown in frontend | test.admin@mail.de | Optional override |
| REACT_APP_SUPPORT_ADMIN_PHONE | Admin phone shown in frontend | 000000000 | Optional override |
| REACT_APP_SUPPORT_SERVICE_EMAIL | Service contact shown in frontend | test.servicepersonnel@mail.de | Optional override |
| REACT_APP_SUPPORT_SERVICE_PHONE | Service phone shown in frontend | 111111111 | Optional override |
| FRONTEND_BASE | Frontend base path (prod) | /frontend-main | Needed |
| BACKEND_PATH | Backend path prefix used by frontend | /backend-main | Needed |
| REACT_APP_BASENAME | React Router basename (local dev) | / | Needed |
| PUBLIC_URL | CRA public URL (local dev) | / | Needed |
| REACT_APP_BACKEND_URL | Backend URL used by frontend (local dev) | http://localhost:8082 | Needed |
| BACKEND_PORT | Exposed backend host port | 8082 | Needed |
| BACKEND_LOGS | Host path for backend logs | ${PROJECT_PATH}/backend/logs_dev_backend/ | Needed |
| BACKEND_CONTAINER | Backend container name | seat-reservation-system-backend-1 | Stable by default via `COMPOSE_PROJECT_NAME` |
| BACKEND_PFX_FILENAME | Backend TLS keystore filename | backend.p12 | Needed when TLS is enabled; file must exist in `$PATH_TO_TLS/backend/` |
| STRICT_CORS | Enforce strict CORS allow-list | false | Set `true` only if `CORS_ALLOWED_ORIGINS` is configured |
| CORS_ALLOWED_ORIGINS | Comma-separated list of allowed origins | https://my-serv:3000,http://my-serv:3000 | Used when `STRICT_CORS=true` |
| MAIL_HOST | SMTP host | mailhog | Needed for notifications |
| MAIL_PORT | SMTP port | 1025 | Needed for notifications |
| MAIL_USERNAME | SMTP username |  | Set if SMTP requires auth |
| MAIL_PASSWORD | SMTP password |  | Set if SMTP requires auth |
| MAIL_PROTOCOL | SMTP protocol | smtp | Needed |
| MAIL_TLS_ENABLED | Enable STARTTLS | false | Set `true` for real SMTP setups as needed |
| MAIL_SMTP_AUTH | Enable SMTP authentication | false | Set `true` for real SMTP setups as needed |
| MAIL_FROM | Sender address for emails | no-reply@example.com | Needed |
| BOOKING_TIMEZONE_ID | Timezone used for calendar notifications | Europe/Berlin | Needed |
| ICS_NOTIFICATIONS_ENABLED | Toggle ICS/calendar notifications | true | Needed |
| FRONTEND_BASE_URL | Frontend base URL used in email links | http://localhost:3001 | Needed |
| MFA_SECRET_ENCRYPTION_KEY | Encryption key for stored MFA secrets | strong-random-key | Needed; use a strong secret in production |
| DATABASE_PORT | Exposed database host port | 3307 | Needed |
| VOLUME | Docker volume name for MariaDB data | mariadb_data_dev | Needed. One of the volumes defined in `docker-compose.yml` |
| DATABASE_CONTAINER | Database container name | seat-reservation-system-database-1 | Stable by default via `COMPOSE_PROJECT_NAME` |
| PW_DB | Database password override variable | mysecret | Usually loaded from `$PATH_TO_TLS/pws/pw_db.txt` by scripts |

### Outlook / ICS notifications
- Features:
  - Outlook-friendly ICS invites on booking creation/confirmation and cancel (desk bookings).
  - Parking request decision emails (approve/reject) with per-user toggle.
  - Timezone Europe/Berlin; localized to the requester’s UI language (en/de).
- Local testing with MailHog:
  1) Start MailHog on the same Docker network as backend (default compose network works):  
     `docker run -d --name mailhog --network seat-reservation-system_mynetwork_dev -p 1025:1025 -p 8025:8025 mailhog/mailhog`  
     (If backend already runs on that network, no extra `docker network connect` step is needed.)
  2) Ensure backend env matches the values above, then restart backend (`docker compose up -d backend`).
  3) Trigger a booking action and check http://localhost:8025 for an email with `booking-<id>.ics`.
- Production: point the mail vars to your SMTP server and set `MAIL_TLS_ENABLED=true` and `MAIL_SMTP_AUTH=true` if required.

## Run the tests
Use `./scripts/test/run_test.sh` after the containers are running.
The test files are located in cypress/cypress/integration/.

If you freshly cloned this project most of the tests will fail, since the test files use some hard coded things. For example: some tests assume that a specific building is stored in the database, and therefore the images of the floor belonging to the building must be stored in `$PROJECT_PATH/frontend/public/Assets/...` . If these are not present in your project the test will fail.

## Running unit tests - Sprint 1
Start by setting the JAVA_HOME environment varible inside your environment running:
export JAVA_HOME="(path to your JDK)" 
export PATH="$JAVA_HOME/bin:$PATH"

Inside the same terminal, assign the filepath to \backend with:
cd backend

Then run the tests with:
mvn test


