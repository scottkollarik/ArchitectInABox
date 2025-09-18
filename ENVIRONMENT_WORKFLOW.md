# Environment Management Workflow

## 🎯 **Best Practice: No Manual Copy/Paste!**

Instead of manually copying `.env` files, use **automated environment switching** with symbolic links and scripts.

## 📁 **File Structure**

```
├── .env.local              # Personal dev settings (gitignored)
├── .env.development        # Shared dev environment (committed)
├── .env.production         # Production secrets (gitignored)
├── .env.production.template # Production template (committed)
├── .env.oauth              # OAuth dev config (gitignored)
└── scripts/
    ├── env-switch.sh       # Environment switcher
    └── dev-start.sh        # Development starter
```

## 🔄 **Environment Switching**

### **Quick Switch Commands**

```bash
# Switch to local development (Docker + anonymous auth)
./scripts/env-switch.sh local

# Switch to OAuth development
./scripts/env-switch.sh oauth-dev

# Switch to production
./scripts/env-switch.sh production
```

### **What Happens:**
1. Creates symbolic links: `.env` → `.env.local`
2. Links `frontend/.env` → `../.env.local`
3. Links `backend/.env` → `../.env.local`
4. **No file copying needed!**

## 🚀 **Development Workflows**

### **Scenario 1: Quick Local Development**
```bash
# One command starts everything
./scripts/dev-start.sh local all

# Opens:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:5001
# - MongoDB: Docker container
# - Azurite: Docker container
```

### **Scenario 2: OAuth Development**
```bash
# Setup OAuth once
./scripts/azure/setup-entra.sh "TA Platform Dev" "http://localhost:5173"

# Start with OAuth
./scripts/dev-start.sh oauth-dev all
```

### **Scenario 3: Production-like Testing**
```bash
# Create production config
cp .env.production.template .env.production
# Edit .env.production with real values

# Test production build locally
npm run build:prod
npm run preview
```

## 📋 **Available Commands**

### **Environment Management**
```bash
./scripts/env-switch.sh <environment>
```
- `local` - Local development (Docker, anonymous)
- `oauth-dev` - Local development with OAuth
- `production` - Production environment
- `development` - Shared development

### **Development Starter**
```bash
./scripts/dev-start.sh [environment] [services]
```
- **Environment**: `local`, `oauth-dev`, `development`
- **Services**: `all`, `frontend`, `backend`, `docker`

### **NPM Scripts (Frontend)**
```bash
npm run dev              # Normal development
npm run dev:oauth        # Development with OAuth
npm run build:prod       # Production build
npm run env:local        # Switch to local env
npm run env:oauth        # Switch to OAuth env
```

## 🔐 **Security Model**

| File | Committed | Contains Secrets | Usage |
|------|-----------|------------------|-------|
| `.env.development` | ✅ Yes | ❌ No | Shared dev config |
| `.env.production.template` | ✅ Yes | ❌ No | Documentation |
| `.env.local` | ❌ No | ❌ No | Personal preferences |
| `.env.production` | ❌ No | ✅ Yes | Real production secrets |
| `.env.oauth` | ❌ No | ✅ Yes | OAuth credentials |

## 🎛️ **Environment Variables Priority**

Vite loads environment variables in this order:

1. `.env.local` (highest priority, gitignored)
2. `.env.[mode].local` (e.g., `.env.production.local`)
3. `.env.[mode]` (e.g., `.env.production`)
4. `.env` (lowest priority)

## 🔧 **Troubleshooting**

### **Symbolic Links Not Working?**
```bash
# Check current links
ls -la .env frontend/.env backend/.env

# Manually fix if needed
rm .env frontend/.env backend/.env
./scripts/env-switch.sh local
```

### **Environment Not Loading?**
```bash
# Verify environment file exists
ls -la .env.local .env.production

# Check file contents
head -5 .env.local
```

### **Docker Services Issues?**
```bash
# Check service status
docker compose ps

# Reset services
docker compose down
docker compose up -d
```

## ✅ **Best Practices**

1. **Never commit** `.env.production` or `.env.oauth`
2. **Use environment switcher** instead of manual copying
3. **Test production builds** before deployment
4. **Keep templates updated** when adding new variables
5. **Document environment changes** in this file

This workflow eliminates manual file management and ensures consistent environment handling across the team!