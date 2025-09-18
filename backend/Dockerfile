# Production build image
# Build with: docker buildx build --platform linux/amd64 -f backend/Dockerfile -t <image> ./backend

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /app

# Copy solution and project files
COPY *.sln .
COPY TechnicalArchitectPlatform.Api/*.csproj ./TechnicalArchitectPlatform.Api/

# Restore packages
RUN dotnet restore

# Copy source code
COPY . .

# Build the application
RUN dotnet publish TechnicalArchitectPlatform.Api -c Release -o out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy published application
COPY --from=build /app/out .

# Expose port
EXPOSE 5000

# Set the entry point
ENTRYPOINT ["dotnet", "TechnicalArchitectPlatform.Api.dll"]
