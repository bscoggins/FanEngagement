# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application (build locally first with: npm run build)
COPY dist ./dist

# Create directory for secrets
RUN mkdir -p /secrets

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/v1/adapter/health || exit 1

# Run as non-root user
USER node

# Start application
CMD ["node", "dist/index.js"]
