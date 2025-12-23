npm config set proxy http://proxy.justiz.sachsen.de:3128
npm config set https-proxy http://proxy.justiz.sachsen.de:3128
#npm config get https-proxy
#npm config delete proxy

#npm config set registry http://registry.npmjs.org/
#npm config set registry https://registry.npmjs.org/

#npm config set timeout 6000000

#npm cache clear --force


# Installieren mit 
#   mvn clean package -DskipTests. 
# Danach schauen ob es auch im offline modus compiliert:
#   mvn clean package -DskipTests -o
# WICHTIG: alle abhängigkeiten aufn Host mit: mvn dependency:go-offline herunterladen!!!

# Kann sein, dass du die ~/.m2 nach ~/DeskSharingTool*/backend/.m2 kopieren musst...

mvn clean install -U -DskipTests -Dmaven.repo.local=/home/r/DeskSharingTool_Dev/backend/.m2/repository
mvn clean package -DskipTests -Dmaven.repo.local=/home/r/DeskSharingTool_Dev/backend/.m2/repository
mvn dependency:go-offline -Dmaven.repo.local=/home/r/DeskSharingTool_Dev/backend/.m2/repository
mvn dependency:tree # fehler im pom finden