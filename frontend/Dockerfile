# Stage 1: Build the React/Vite application
FROM node:20 AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# ✅ FIXED
RUN npm ci --include=optional

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]