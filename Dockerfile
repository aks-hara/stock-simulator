# Use official Node.js LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy backend package manifests first to leverage Docker layer caching
COPY backend/package*.json ./backend/

# Install production dependencies for backend
RUN npm ci --prefix backend --production

# Copy the rest of the project
COPY . .

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Expose application port
EXPOSE 5000

# Start the backend server (which serves frontend static files)
WORKDIR /app/backend
CMD ["node", "server.js"]
