#!/bin/bash

# Start development environment for Technical Architect Platform
# Usage: ./scripts/dev-start.sh [environment] [services]
# Environment: local (default), oauth-dev, development
# Services: all (default), frontend, backend, docker

set -e

ENV=${1:-local}
SERVICES=${2:-all}

echo "🚀 Starting Technical Architect Platform"
echo "Environment: $ENV"
echo "Services: $SERVICES"
echo

# Switch environment
./scripts/env-switch.sh "$ENV"

echo "🐳 Starting services..."

case $SERVICES in
    "all"|"full")
        echo "📦 Starting Docker services..."
        docker compose up -d

        echo "⏳ Waiting for services to be ready..."
        sleep 5

        echo "🌐 Starting frontend..."
        cd frontend
        npm run dev &
        FRONTEND_PID=$!
        cd ..

        echo "🔧 Starting backend..."
        cd backend
        dotnet run &
        BACKEND_PID=$!
        cd ..

        echo
        echo "✅ All services started!"
        echo "🌐 Frontend: http://localhost:5173"
        echo "🔧 Backend: http://localhost:5001"
        echo "📊 MongoDB: mongodb://localhost:27017"
        echo "💾 Azurite: http://localhost:10000"
        echo
        echo "🛑 To stop all services:"
        echo "   kill $FRONTEND_PID $BACKEND_PID"
        echo "   docker compose down"

        # Wait for user interrupt
        trap "echo '🛑 Stopping services...'; kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; docker compose down; exit 0" SIGINT SIGTERM
        wait
        ;;

    "frontend"|"web")
        echo "🌐 Starting frontend only..."
        cd frontend && npm run dev
        ;;

    "backend"|"api")
        echo "🐳 Starting Docker services..."
        docker compose up -d mongodb azurite
        echo "🔧 Starting backend..."
        cd backend && dotnet run
        ;;

    "docker"|"services")
        echo "🐳 Starting Docker services only..."
        docker compose up -d
        echo "✅ Docker services started!"
        echo "📊 MongoDB: mongodb://localhost:27017"
        echo "💾 Azurite: http://localhost:10000"
        ;;

    *)
        echo "❌ Unknown services option: $SERVICES"
        echo "📋 Available options:"
        echo "   all       - Start everything (Docker + Frontend + Backend)"
        echo "   frontend  - Start frontend only"
        echo "   backend   - Start backend + Docker dependencies"
        echo "   docker    - Start Docker services only"
        exit 1
        ;;
esac