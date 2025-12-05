# Multi-stage build for Solana adapter

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy source code
COPY tsconfig.json ./
COPY jest.config.json ./
COPY src ./src
COPY tests ./tests

# Build TypeScript
RUN npm run build

# Stage 2: Test (for CI)
FROM builder AS test
# Run only unit tests (integration tests require external services)
RUN npm test -- --testPathIgnorePatterns=integration

# Stage 3: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create directory for secrets with proper ownership
RUN mkdir -p /secrets && chown node:node /secrets

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
