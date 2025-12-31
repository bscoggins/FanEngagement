# Multi-stage build for Polygon adapter

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /workspace

# Copy shared helpers so relative imports resolve during builds
COPY adapters/shared ./adapters/shared

# Copy package files for the Polygon adapter and install dependencies
WORKDIR /workspace/adapters/polygon
COPY adapters/polygon/package*.json ./
ENV NODE_ENV=development \
    NPM_CONFIG_CACHE=/tmp/.npm
RUN npm install --include=dev --no-audit --progress=false || (cat /tmp/.npm/_logs/* || true; exit 1)
RUN test -x node_modules/.bin/tsc || (ls -la node_modules/.bin 2>/dev/null || true; cat /tmp/.npm/_logs/* 2>/dev/null || true; exit 1)

# Copy source code
COPY adapters/polygon/tsconfig.json ./
COPY adapters/polygon/jest.config.json ./
COPY adapters/polygon/src ./src
COPY adapters/polygon/tests ./tests

# Build TypeScript
RUN npm run build

# Stage 2: Test (for CI)
FROM builder AS test
# Run only unit tests (integration tests require external services)
RUN npm test -- --testPathIgnorePatterns=integration

# Stage 3: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy shared helpers for runtime imports
COPY adapters/shared ./adapters/shared

# Prepare adapter workspace and install production dependencies
WORKDIR /app/adapters/polygon
COPY adapters/polygon/package*.json ./
RUN npm install --omit=dev --no-audit --progress=false

# Copy built application from builder stage
COPY --from=builder /workspace/adapters/polygon/dist ./dist

# Create directory for secrets with proper ownership
RUN mkdir -p /secrets && chown node:node /secrets

# Set environment variables
ENV NODE_ENV=production \
    PORT=3002

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/v1/adapter/health || exit 1

# Run as non-root user
USER node

# Start application
CMD ["node", "dist/index.js"]
