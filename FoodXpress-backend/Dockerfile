# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy Maven configuration from the backend folder
COPY FoodXpress-backend/pom.xml ./pom.xml

# Download dependencies
RUN mvn -B dependency:go-offline

# Copy Java source code
COPY FoodXpress-backend/src ./src

# Build the Spring Boot application
RUN mvn -B clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -jar app.jar"]