# Use official Node.js image
FROM node:20 AS build

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Define environment variables (overridden by docker-compose)
ENV PORT=5000
ENV NODE_ENV=production

# Start the application
CMD ["node", "index.js"]
