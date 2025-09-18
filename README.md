# Technical Product Architect Platform MVP

A comprehensive cloud architecture planning and learning tool that helps Technical Product Architects assess Non-Functional Requirements (NFRs) and design Azure-based solutions.

## Features

- **NFR Assessment Form** - Collapsible sections with rollup checkmarks for requirements gathering
- **Azure Services Browser** - Categorized service catalog with drag-and-drop functionality  
- **Architecture Canvas** - Visual architecture builder with auto-dependency inclusion
- **Cost Estimation** - Basic pricing calculator for architecture components
- **Educational Content** - Learning modules for cloud architecture patterns

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone and start services (local dev stack):**
   ```bash
   git clone <repository-url>
   cd technical-architect-platform
   docker compose up --build
   ```

2. **Access the application:**
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:5000/swagger
   - **MongoDB**: localhost:27017

### Development Workflow

- Frontend hot reload is enabled for development
- Backend API includes Swagger documentation
- MongoDB data persists between container restarts

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │───▶│ ASP.NET Core API │───▶│   MongoDB       │
│   (Port 5173)   │    │   (Port 5000)   │    │  (Port 27017)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Project Structure

```
technical-architect-platform/
├── README.md                    # This file
├── docker-compose.yml          # Local dev containers (hot reload)
├── .env.example               # Environment variables template
├── frontend/                  # React application
│   ├── src/
│   │   ├── modules/
│   │   │   └── cloud-architecture/  # Main feature module
│   │   ├── components/        # Shared components
│   │   └── styles/           # Global styles
│   ├── Dockerfile.dev        # Frontend dev container (Vite)
│   ├── Dockerfile            # Frontend production build (nginx)
│   └── nginx.conf            # SPA routing config for production image
└── backend/                  # ASP.NET Core API
    ├── TechnicalArchitectPlatform.Api/
    │   ├── Program.cs        # Minimal APIs setup
    │   └── *.csproj         # Project configuration
    ├── Dockerfile.dev       # Backend dev container (dotnet watch)
    └── Dockerfile           # Backend production image

## Building Production Images (linux/amd64)

Deployments to Azure Container Apps require amd64 images. Use the helper script to build and optionally push matching backend/front-end images:

```bash
# Push linux/amd64 images to GHCR (or your registry)
./scripts/build-containers.sh ghcr.io/<user> latest --push

# Load linux/amd64 images into the local Docker engine instead of pushing
./scripts/build-containers.sh ghcr.io/<user> test --load
```

The script wraps `docker buildx build` with the production Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`).
Override the build platform with `PLATFORM=<value>` if you need a different target (defaults to `linux/amd64`).
```

## Usage

### NFR Assessment
1. Open the application at http://localhost:5173
2. Fill out the NFR assessment form in the left panel
3. Sections show completion status with rollup checkmarks
4. Required vs optional questions are clearly marked

### Architecture Design
1. Browse Azure services in the center panel
2. Expand categories to view available services
3. Drag services to the architecture canvas (right panel)
4. Required dependencies are automatically included
5. Remove services using the trash icon

### Service Categories
- **Compute**: Container Apps, AKS, App Service
- **Storage & Data**: SQL Database, Cosmos DB, Blob Storage
- **Security**: Key Vault, Front Door, Private Endpoints
- **Monitoring**: Application Insights, Log Analytics
- **Networking**: Virtual Network, Load Balancer, NSGs
- **Identity**: Entra ID, Managed Identity

## Development

### Frontend Stack
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React DnD for drag-and-drop
- React Router for navigation

### Backend Stack
- ASP.NET Core 8.0 (Minimal APIs)
- MongoDB for data persistence
- Swagger/OpenAPI for documentation

### Container Environment
- Multi-stage Docker builds
- Development volume mounting for hot reload
- Persistent MongoDB data volumes

## Roadmap

### Phase 1: MVP (Current)
- [x] Basic NFR assessment form
- [x] Azure services browser
- [x] Drag-and-drop architecture builder
- [x] Auto-dependency inclusion

### Phase 2: Enhanced Features
- [ ] Architecture diagram visualization with visx
- [ ] Advanced pricing calculator
- [ ] NFR question dependencies
- [ ] Service conflict detection

### Phase 3: Educational Content
- [ ] Interactive learning modules
- [ ] Architecture pattern explanations
- [ ] Best practices recommendations
- [ ] Cost optimization guidance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit a pull request

## License

MIT License - see LICENSE file for details
