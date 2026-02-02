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

There are some variables we must can change (but the default values from `.env_template` are fine):
* Network must be set either to mynetwork_dev or mynetwork. Both of them are defined in docker-compose.yml
* BACKEND_LOGS must be set to an directory where we like to store the logging messages. Choose a folder you like. E.g.: `${PROJECT_PATH}/backend/logs_dev_backend/`.
* VOLUME must set either to mariadb_data_dev or mariadb_data. Both are defined in docker-compose.yml.

In the next step we find the names of our containers and add them to .env.
Execute `docker ps`. You will se all running containers. Hopefully among them you see our three project containers. With docker `ps --format "table {{.ID}}}\t{{.Names}}"` you only get the the id and the name of the containers. 

First search for a container namend something with frontend. This is the container name of our frontend container. Copy the name and add it in .env as FRONTEND_CONTAINER. Do similiar with backend and database.

Now we add the needed tls informations to .env.
Earlier we put our pfx TLS file in `PATH_TO_TLS/backend/`. Now we add the full name (with extension) of this .pfx file and write it in .env as BACKEND_PFX_FILENAME. Attention: you only need to do this if you you want to use TLS. 

Now we do a similiar thing regarding the frontend. Do a `ls $PATH_TO_TLS/frontend/` and you will see two files. The name of the file with the extension .crt is added to .env for FRONTEND_CRT_FILE. The file with the extension .key is added for FRONTEND_KEY_FILE. Attention: you only need to do this if you you want to use TLS. 

Check if the default values for FRONTEND_PORT, BACKEND_PORT and DATABASE_PORT matches your needs.

A list of most of the params is in the following table:

| Parametername      | Use | Example        | Remarks |
|-----------|-------|--------------|--------------|
| PROJECT_PATH      | The path to the project on the host | /home/r/DesksharingTool_Dev  | Needed |
|PATH_TO_TLS       | The path to the directory with the TLS certs    | /home/r/tls     | Needed |
| IP   | The ip or name of the host machine    | my-srv     | Needed |
| NETWORK | The name of the docker network used for this project | mynetwork_dev | Needed.  One of the two defined networks in docker-compose.yml |
| USE_TLS | True if tls shall be used | false | Needed |
| LDAP_DIR_CONTEXT_URL | The url of the ldap/AD server | ldaps://srv.de | Empty if no ldap is needed.
| LDAP_DIR_CONTEXT_PRINCIPAL | The username of the member of AD | ldap_service_user,OU=Funktion,OU=AD-Management,DC=foo,DC=bar,DC=baz | Needed if LDAP_DIR_CONTEXT_PRINCIPAL is not empty | 
| LDAP_USER_BASE | The base ou if we look for users. | OU=org | Needed if LDAP_DIR_CONTEXT_PRINCIPAL is not empty |
| LDAP_USER_FILTER | The filter if we look for users. | "(&(objectClass=user)(mail={0}))" | Needed if LDAP_DIR_CONTEXT_PRINCIPAL is not empty |
| LDAP_GROUP_BASE | The base ou if we look for groups. | Groups,OU=org | Needed if LDAP_DIR_CONTEXT_PRINCIPAL is not empty |
| LDAP_GROUP_FILTER | The filter if we look for groups. | (distinguishedName={0}) | Needed if LDAP_DIR_CONTEXT_PRINCIPAL is not empty |
| LDAP_BASE |  The default dc (domain component). | DC=org,DC=fs,DC=de | 
| ERROR_USER_NOT_FOUND_IN_AD | Error if a user was not found in ad. This value is an key in frontend/src/locales | "ERROR_USER_NOT_FOUND_IN_AD" | Needed |
| ERROR_USER_NOT_FOUND_IN_DAO | Error if a user was not found in our db. This value is an key in frontend/src/locales | "ERROR_USER_NOT_FOUND_IN_DAO" | Needed |
| ERROR_WRONG_PW | Error if the password is wrong. This value is an key in frontend/src/locales | "ERROR_WRONG_PW" | Needed |
| http_proxy | The proxy server for http | http://proxy.de:3128 | Not needed |
| https_proxy | The proxy server for https | http://proxy.de:3128 | Not needed |
| TEST_EMPLOYEE_MAIL | Mail for a test employee | test.employee@mail.de | Needed for tests |
| TEST_ADMIN_MAIL | Mail for a test admin | test.admin@mail.de | Needed for tests |
| TEST_SERVICE_PERSONNEL_MAIL | Mail for a test employee | test.employee@mail.de | Needed for tests |
| TEST_EMPLOYEE_PW | PW for test employee | test | Needed for tests |
| TEST_ADMIN_PW | PW for test admin | test | Needed for tests |
| TEST_SERVICE_PERSONNEL_PW | PW for test admin | test | Needed for tests |
| FRONTEND_TARGET | Set build to production | "production_runtime" | Needed. Dont change | 
| FRONTEND_KEY_FILE | Name of the frontend tls key file (unencrypted) | frontend.key | Needed. Must be in $PATH_TO_TLS/frontend/. |
| FRONTEND_CRT_FILE | Name of the frontend tls crt file | frontend.crt | Needed.  Must be in $PATH_TO_TLS/frontend/. | 
| CREATE_SERIES_DEFAULT_STARTTIME | Default start time for series creation | 12:00:00 | Needed |
| CREATE_SERIES_DEFAULT_ENDTIME | Default end time for series creation | 14:00:00 | Needed |
| CREATE_SERIES_DEFAULT_FREQUENCY=daily | Default frequency for series creation | daily | Needed |
| FRONTEND_PORT | The exposed port where the frontend container accepts connections | 3000 | Needed |
| FRONTEND_CONTAINER | Name of the frontend container | seat-reservation-system-frontend-1 | Needed. Depending on the project name. Since my project is called seat-reservation-system the container is named seat-reservation-system-frontend-1. | 
| BACKEND_PORT | The exposed port where the backend container accepts connections | 8082 | Needed |
| BACKEND_LOGS | Path to the backend log dir on the host machine | /home/usr/logs_dev_backend | Needed |
| BACKEND_CONTAINER | Name of the backend container | seat-reservation-system-backend-1 | Needed. Depending on the project name. Since my project is called seat-reservation-system the container is named seat-reservation-system-backend-1 |
| BACKEND_PFX_FILENAME | Name of pfx file for the backend crt. | backend.pfx | Needed. Must be in $PATH_TO_TLS/backend/. |
| STRICT_CORS | If true only strictly defined urls are allowed to received data from etc.. | false | If all urls shall be allowed keep it false |
| CORS_ALLOWED_ORIGINS | A list of allowed origins. Only evaluated if STRICT_CORS=true. | https://my-serv:3000,http://my-serv:3000 |
| DATABASE_PORT | The exposed port where the db container accepts connections | 3307 | Needed |
| DATABASE_CONTAINER | Name of the db container | seat-reservation-system-database-1 | Needed. Depending on the project name. Since my project is called seat-reservation-system the container is named seat-reservation-system-database-1 |
| VOLUME | Name of the volume of the db | mariadb_data |Needed. One of the two defined volumes in docker-compose.yml |


If you freshly cloned this project it advisable to set STRICT_CORS=false and USE_TLS=false.

## Run the tests
Use `./scripts/test/run_test.sh` after the containers are running.
The test files are located in cypress/cypress/integration/.

If you freshly cloned this project most of the tests will fail, since the test files use some hard coded things. For example: some tests assume that a specific building is stored in the database, and therefore the images of the floor belonging to the building must be stored in `$PROJECT_PATH/frontend/public/Assets/...` . If these are not present in your project the test will fail.

