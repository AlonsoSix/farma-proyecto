# =====================================================================
#  Backend - Spring Boot (API REST)
#  Construcción en dos etapas: compila con Maven y ejecuta con una JRE.
#  La imagen final no contiene Maven ni el código fuente.
# =====================================================================

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Primero las dependencias: Docker reutiliza esta capa si no cambia el pom.
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

RUN groupadd --system farma && useradd --system --gid farma farma

COPY --from=build /app/target/farma-backend-0.0.1-SNAPSHOT.jar /app/app.jar

USER farma
EXPOSE 8081

# La configuración llega por variables de entorno (ver .env.example).
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
