# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build
# Copies both the CatalogRefresh project and the Api project (shared types).
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore — copy project files first for layer-cache efficiency
COPY TechnicalArchitectPlatform.CatalogRefresh/TechnicalArchitectPlatform.CatalogRefresh.csproj \
     TechnicalArchitectPlatform.CatalogRefresh/
COPY TechnicalArchitectPlatform.Api/TechnicalArchitectPlatform.Api.csproj \
     TechnicalArchitectPlatform.Api/

RUN dotnet restore TechnicalArchitectPlatform.CatalogRefresh/TechnicalArchitectPlatform.CatalogRefresh.csproj

# Copy source for both projects
COPY TechnicalArchitectPlatform.CatalogRefresh/ TechnicalArchitectPlatform.CatalogRefresh/
COPY TechnicalArchitectPlatform.Api/             TechnicalArchitectPlatform.Api/

# Publish self-contained build
RUN dotnet publish TechnicalArchitectPlatform.CatalogRefresh/TechnicalArchitectPlatform.CatalogRefresh.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime
# Uses dotnet/runtime (not aspnet) — no web server needed for a batch job.
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/runtime:8.0 AS runtime
WORKDIR /app

# Copy published output from build stage
COPY --from=build /app/publish .

# Run as non-root for security best practice
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Environment variable defaults (all required vars must be supplied at runtime)
# MONGODB_CONNECTION_STRING — required
# ANTHROPIC_API_KEY         — required
# DATABASE_NAME             — optional, defaults to "tapdb"
# AZURE_PRICING_API_BASE    — optional, defaults to "https://prices.azure.com"

ENTRYPOINT ["dotnet", "TechnicalArchitectPlatform.CatalogRefresh.dll"]
