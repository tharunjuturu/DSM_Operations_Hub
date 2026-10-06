# Build & Production Image for DSM Operations Hub
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package definition files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source code
COPY . .

# Build Vite frontend static bundle for production
RUN npm run build

# Expose port (default 3001, dynamically overridable by GCP PORT env)
EXPOSE 3001

# Start Node.js Express server
CMD ["node", "server.js"]
