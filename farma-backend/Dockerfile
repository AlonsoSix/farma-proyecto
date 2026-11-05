# ---------- Etapa 1: compilar el backend con Maven ----------
FROM maven:3.9-eclipse-temurin-21 AS compilar
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

# ---------- Etapa 2: imagen liviana solo con Java para ejecutarlo ----------
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=compilar /app/target/*.jar farma-backend.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "farma-backend.jar"]
