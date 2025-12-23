FROM maven:3.8.4-openjdk-17-slim AS build

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy TLS certificates
#COPY tls src/main/resources/tls

# Copy Maven proxy and settings (offline pre-configured)
COPY pom.xml .
COPY settings.xml /usr/share/maven/
COPY settings.xml /root/.m2/

# Copy the Maven project files into the container
COPY src src

#RUN mvn clean package -DskipTests
RUN mvn clean package -DskipTests -Pprod -Dmaven.test.skip=true

# FROM openjdk:17-slim-bullseye
FROM eclipse-temurin:17-jre-alpine
# RUN apt-get update
# RUN apt-get install curl -y
# RUN apt-get install iputils-ping -y
# RUN apt-get install telnet -y
# RUN apt-get install -y net-tools

# Change timezone.
ENV TZ=Europe/Paris

WORKDIR /usr/src/app
COPY ca_ad.cer /usr/local/share/ca-certificates/ldapserver.crt
RUN keytool -import -trustcacerts -alias ldapserver \
    -file /usr/local/share/ca-certificates/ldapserver.crt \
    -keystore $JAVA_HOME/lib/security/cacerts -storepass changeit -noprompt

# Copy the compiled JAR file from the build stage
COPY --from=build /usr/src/app/target/backend-0.0.1-SNAPSHOT.jar backend-0.0.1-SNAPSHOT.jar

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]