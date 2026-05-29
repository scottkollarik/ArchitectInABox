# Environment Setup Guide

## Quick Start

For **local development**, you need these files:

```bash
# Copy the example files
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

## Environment Files Overview

| File | Purpose | Required For |
|------|---------|--------------|
| `.env` | Docker Compose + shared variables | Local development |
| `frontend/.env` | Vite build-time variables | Frontend development |
| `backend/.env` | ASP.NET Core runtime variables | Backend development |

## Development Scenarios

### 1. **Anonymous Mode (Quickest Start)**

**Root `.env`:**
```bash
VITE_AUTH_MODE=dev
VITE_API_URL=http://localhost:5001
ConnectionStrings__MongoDB=mongodb://admin:password123@mongodb:27017/technical-architect-db?authSource=admin
```

**Frontend `.env`:**
```bash
VITE_AUTH_MODE=dev
VITE_API_URL=http://localhost:5001
```

**Backend `.env`:**
```bash
ASPNETCORE_ENVIRONMENT=Development
ConnectionStrings__MongoDB=mongodb://admin:password123@mongodb:27017/technical-architect-db?authSource=admin
```

### 2. **OAuth Mode (Production-like)**

First, set up Entra ID:
```bash
./scripts/azure/setup-entra.sh "TA Platform Dev" "http://localhost:5173"
```

Then update your `.env` files with the output values:

**All `.env` files:**
```bash
VITE_AUTH_MODE=oauth
VITE_OAUTH_CLIENT_ID=your-app-id-from-script
VITE_OAUTH_TENANT_ID=your-tenant-id-from-script
EntraAuth__ClientId=your-app-id-from-script
EntraAuth__TenantId=your-tenant-id-from-script
```

## Production Deployment Variables

These are **automatically set** by deployment scripts:

```bash
# Set by deploy.sh
VITE_API_URL=https://your-backend.azurecontainerapps.io/aib/api
ConnectionStrings__CosmosDB=AccountEndpoint=...
ConnectionStrings__AzureBlob=DefaultEndpointsProtocol=https...

# Set by setup-entra.sh
VITE_OAUTH_REDIRECT_URI=https://your-frontend.azurecontainerapps.io/aib/auth/callback
VITE_OAUTH_SCOPE=api://your-frontend-app-id/user_impersonation
```

## Missing Variables Check

### ❌ **Required but missing from your original files:**

1. **OAuth Integration:**
   - `VITE_OAUTH_CLIENT_ID`
   - `VITE_OAUTH_TENANT_ID`
   - `VITE_OAUTH_REDIRECT_URI`
   - `VITE_OAUTH_SCOPE`
   - `EntraAuth__ClientId`
   - `EntraAuth__TenantId`

2. **Authentication Mode:**
   - `VITE_AUTH_MODE` (dev/oauth)

3. **Backend Connection Strings:**
   - `ConnectionStrings__AzureBlob` (for artifact storage)
   - `EntraAuth__*` settings

### ✅ **Already covered in your files:**
- `VITE_API_URL`
- `ASPNETCORE_ENVIRONMENT`
- `ConnectionStrings__MongoDB`
- Docker Compose variables

## Startup Commands

```bash
# Start all services
docker compose up -d

# Start frontend only (after backend is running)
cd frontend && npm run dev

# Start backend only (after database is running)
cd backend && dotnet run
```

## Troubleshooting

**Port conflicts:**
```bash
# Check what's using ports
lsof -i :5001 -i :5173 -i :27017 -i :10000
```

**OAuth issues:**
```bash
# Check Entra ID app registration
az ad app list --display-name "Your App Name"
```

**Database connection:**
```bash
# Test MongoDB connection
docker exec -it mongodb mongosh -u admin -p password123
```

The deployment scripts will handle production configuration automatically!
