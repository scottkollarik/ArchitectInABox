# Production build image for the frontend
# Build with: docker buildx build --platform linux/amd64 -f frontend/Dockerfile -t <image> ./frontend

FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=/aib/api
ARG VITE_BASE_PATH=/aib
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
RUN npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default configuration and replace with SPA-friendly config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
