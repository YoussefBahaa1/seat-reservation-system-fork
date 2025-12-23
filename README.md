# Desk-Sharing-Tool

Web application that allows to book workspaces in an office.

## Original project

`https://github.com/Gazzo-gif/Desk-Sharing-Tool`

## Before you can start

### First steps
After you cloned this repo go into the freshly created project directory.
This directory is your project root. Later we will write the absolute path to our project root in the .env file as PROJECT_PATH. In the future I will reference the project root als \$PROJECT_PATH. Amongst other you will find here the directories frontend, backend, database. These are the main pillars of this project.

To go further create an directory tls wherever you like. This directory later holds everything needed for tls/https communication. We write down the absolute path to this directory to add it later in the .env file as PATH_TO_TLS.
In the future I will reference the tls dir  as \$PATH_TO_TLS.
In the tls directory we first add an other directory called pws.
In $PATH_TO_TLS/pws/ we create an file called pw_db.txt.
The only content of this file shall be the password of our database.
Create on and write it in $PATH_TO_TLS/pws/pw_db.txt.

In the next step we go further with the tls directory \$PATH_TO_TLS. 

### TLS
Attention: later in .env we will see a flag called USE_TLS. Its default value is false, indicating that we dont want to use tls encryption. This means we dont have to do all the work described in this chapter. Anyway, the password files are still stored in the subfolder pws in the tls folder. So everytime an certificate file is mentioned ignore this if you set USE_TLS to false.

In order to use tls ask your CA for a server certificate. \
You can also create your own self signed cert. You need it in the .pfx format. \
Independent if you want to use TLS or not you have to create a folder to store all the (maybe needed) cert stuff and password files. The path to this folder is later stored in the parameter PATH_TO_TLS in .env. If you followed the previous step this directory already exists. \
Here you create the subfolder backend.

In \${PATH_TO_TLS}/backend you add the pfx file. The name of this file is BACKEND_PFX_FILENAME in .env. To be sure you can create that directory even if you dont use TLS.

Create the folder \${PATH_TO_TLS}/frontend. To be sure you can create that directory even if you dont use TLS. Here you store the crt file and the key file for the certificate (must be unencrypted). You can extract key- and certfile with openssl. These files are represented by FRONTEND_KEY_FILE and FRONTEND_CRT_FILE in .env.

To make sure no passwords are hard coded in the containers we also create the folder \${PATH_TO_TLS}/pws/. This directory and its content is needed even if no TLS is used!

Here we create an file called pw_tls.txt. This file hase the password for our certifcation file as content. If no TLS is needed you can create an empty file with the specified name.

We also create \${PATH_TO_TLS}/pws/pw_db.txt and \${PATH_TO_TLS}/pws/pw_ldap.txt. These files contain the password for the database and for the service user of ldap. If ldap is not used it can be empty.

### Create .env
.env is used to store parameters that are used to run the project.
Some of them may be confidential or vary based on the environment.
So some of them must be set by hand.
First copy the .env_template to .env.

There are some variables we must define before we can start:
* PROJECT_PATH must set to the absolute path of the root of our project.
* PATH_TO_TLS must be set to the absolute path of the dir where we prior store our tls stuff and passwords.
* IP must be set to the name/ip of our host machine.
* Network must be set either to mynetwork_dev or mynetwork. Both of them are defined in docker-compose.yml
* BACKEND_LOGS must be set to an directory where we like to store the logging messages. Choose a folder you like. E.g.: \${PROJECT_PATH}/backend/logs_dev_backend/.
* VOLUME must set either to mariadb_data_dev or mariadb_data. Both are defined in docker-compose.yml.

These are the main params. If you set them you be able to first start your project. From the project root use ./scripts/build_and_run.sh

The first run may take some time.
After the project is started you may see many errors in the project. We will handle them later. 

In the next step we find the names of our containers and add them to .env.
Execute `docker ps`. You will se all running containers. Hopefully among them you see our three project containers. With docker `ps --format "table {{.ID}}}\t{{.Names}}"` you only the the id and the name of the containers. 

First search for a container namend something with frontend. This is the container name of our frontend container. Copy the name and add it in .env as FRONTEND_CONTAINER. Do similiar with backend and database.

Now we add the needed tls informations to .env.
Earlier we put our pfx TLS file in $PATH_TO_TLS/backend/. Now we add the full name (with extension) of this .pfx file and write it in .env as BACKEND_PFX_FILENAME. Attention: you only need to do this if you you want to use TLS. 

Now we do a similiar thing regarding the frontend. Do a `ls \$PATH_TO_TLS/frontend/` and you will see two files. The name of the file with the extension .crt is added to .env for FRONTEND_CRT_FILE. The file with the extension .key is added for FRONTEND_KEY_FILE. Attention: you only need to do this if you you want to use TLS. 

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
| LDAP_BASE |  The default dc (domain component). | DC=org,DC=sachsen,DC=de | 
| ERROR_USER_NOT_FOUND_IN_AD | Error if a user was not found in ad. This value is an key in frontend/src/locales | "ERROR_USER_NOT_FOUND_IN_AD" | Needed |
| ERROR_USER_NOT_FOUND_IN_DAO | Error if a user was not found in our db. This value is an key in frontend/src/locales | "ERROR_USER_NOT_FOUND_IN_DAO" | Needed |
| ERROR_WRONG_PW | Error if the password is wrong. This value is an key in frontend/src/locales | "ERROR_WRONG_PW" | Needed |
| http_proxy | The proxy server for http | http://proxy.de:3128 | Not needed |
| https_proxy | The proxy server for https | http://proxy.de:3128 | Not needed |
| TEST_USER_MAIL | Mail for a test user | test.user@srv.sachsen.de | Needed for tests |
| TEST_ADMIN_MAIL | Mail for a test admin | test.user@srv.sachsen.de | Needed for tests |
| TEST_USER_PW | PW for test user | test | Needed for tests |
| TEST_ADMIN_PW | PW for test admin | test | Needed for tests |
| FRONTEND_TARGET | Set build to production | "production_runtime" | Needed. Dont change | 
| FRONTEND_KEY_FILE | Name of the frontend tls key file (unencrypted) | frontend.key | Needed. Must be in $PATH_TO_TLS/frontend/. |
| FRONTEND_CRT_FILE | Name of the frontend tls crt file | frontend.crt | Needed.  Must be in $PATH_TO_TLS/frontend/. | 
| CREATE_SERIES_DEFAULT_STARTTIME | Default start time for series creation | 12:00:00 | Needed |
| CREATE_SERIES_DEFAULT_ENDTIME | Default end time for series creation | 14:00:00 | Needed |
| CREATE_SERIES_DEFAULT_FREQUENCY=daily | Default frequency for series creation | daily | Needed |
| FRONTEND_PORT | The exposed port where the frontend container accepts connections | 3000 | Needed |
| FRONTEND_CONTAINER | Name of the frontend container | desksharingtool_dev-frontend-1 | Needed. Depending on the project name. Since my project is called DeskharingTool_Dev the container is named desksharingtool_dev-frontend-1. | 
| BACKEND_PORT | The exposed port where the backend container accepts connections | 8082 | Needed |
| BACKEND_LOGS | Path to the backend log dir on the host machine | /home/usr/logs_dev_backend | Needed |
| BACKEND_CONTAINER | Name of the backend container | desksharingtool_dev-backend-1 | Needed. Depending on the project name. Since my project is called DeskharingTool_Dev the container is named desksharingtool_dev-backend-1 |
| BACKEND_PFX_FILENAME | Name of pfx file for the backend crt. | backend.pfx | Needed. Must be in $PATH_TO_TLS/backend/. |
| STRICT_CORS | If true only strictly defined urls are allowed to received data from etc.. | false | If all urls shall be allowed keep it false |
| CORS_ALLOWED_ORIGINS | A list of allowed origins. Only evaluated if STRICT_CORS=true. | https://my-serv:3000,http://my-serv:3000 |
| DATABASE_PORT | The exposed port where the db container accepts connections | 3307 | Needed |
| DATABASE_CONTAINER | Name of the db container | desksharingtool_dev-database-1 | Needed. Depending on the project name. Since my project is called DeskharingTool_Dev the container is named desksharingtool_dev-database-1 |
| VOLUME | Name of the volume of the db | desksharingtool_dev-database-1 |Needed. One of the two defined volumes in docker-compose.yml |


If you freshly cloned this project it advisable to set STRICT_CORS=false and USE_TLS=false.

### Prepare the database
Be sure to that all needed Params like VOLUME, PATH_TO_TLS and DATABASE_CONTAINER are correctly set in .env. Also check if you already written your database password in ${PATH_TO_TLS}/pws/pw_db.txt. 

`cd` to project root (\$PROJECT_PATH). Here do `chmod -R +x scripts/` if needed.

To add a rudimentary dataset to the db execute the following script from the project root: `scripts/db/init/initDatabase.sh`. Accept with 'y' and the script will add basic rooms, users, etc. It is important that at least the database container (which you already defined in .env with DATABASE_CONTAINER in the .env)
is running.

If everything worked fine youre freshly started project (again with `./scripts/build_and_run.sh`) will show no errors in the log. Now you can open a browser and type in the value of IP (from .env) followed by an ':' with the FRONTEND_PORT (also from .env) to get an url. A leading https:// will indicate that we like to use tls. So the complete url may look like: https//my-srv:3000. But if you dont use TLS the urls is http//my-srv:3000. Please note that some browser will not accept non https requests. A http environment was tested with firefox.

Hopefully you see the landing page. Here you can enter your credentials.  
Prior we added a test user and a test admin. The later will allow us to add real world persons and rooms etc. So enter test.admin@mail.de as mail and the password test. Now you can enter the real application.

## Run the project
Use ./scripts/build_and_run.sh. This will create the docker images. Also the containers are started. 
Please see prior chapter if you want to start the project for the first time.

## Maintenance

### Floor images
Every room is associated with an floor in an building.
This tool helps to visualize the position of the rooms with a floor plan of every floor. Every room is associated with a x- and a y-coordinate. The user see the room on the floor plan according to the x- and y-coordinate.
That implies that for every floor an floor plan must be present. 

Now the images of the floor plan are stored as .png in \$PROJECT_PATH/frontend/public/Assets/BuildingName where BuildingName must match to the name of the building stored in table buildings in the database.

This approach is prone to errors. A better solution for the future is to store the images as blobs directly in the database.

For now you have to follow the following steps to add a new building or new floors to existing buildings.

1. Add a new entry to the table building. (only if you want to create a new building)
2. Add a new entry to the table floor with floor_id as a foreign key to the needed building row. Note the name of the new floor.
3. in \$PROJECT_PATH/frontend/public/assets/ create a new folder with the name of the building. The folder may be named \$PROJECT_PATH/frontend/public/assets/Mustergebäude.
4. For every floor you must have a png file representing the floor plan. The png file must have exact the same name as the freshly added floor in the floors table.
5. If you restart your application (`./scripts/build_and_run.sh`) and choose the building and the floor you can add new rooms with new desks (if you have admin rights). After this these desks can be booked.

## Run the tests
Use `./scripts/test/run_test.sh` after the containers are running.
The test files are located in cypress/cypress/integration/.

If you freshly cloned this project most of the tests will fail, since the test files use some hard coded things. For example: some tests assume that a specific building is stored in the database, and therefore the images of the floor belonging to the building are stored in $PROJECT_PATH/frontend/public/Assets/... . If these are not present in your project the test will fail..

