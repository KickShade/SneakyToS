# Stage 1: Build React Frontend with Vite
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency specifications
COPY web/package*.json ./
RUN npm ci

# Copy web source and build production bundle
COPY web/ ./
RUN npm run build

# Stage 2: Serve via Nginx Reverse Proxy
FROM nginx:alpine

# Copy built production assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

