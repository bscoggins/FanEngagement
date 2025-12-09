# Multi-stage build for Solana adapter
#
# NOTE: This Dockerfile must be built with the repository root as the build context
# because it requires access to adapters/shared. Build from repo root with:
#   docker build -f adapters/solana/Dockerfile -t solana-adapter .
# Or use docker-compose which sets context: . automatically.

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /workspace

# Copy shared helpers so relative imports resolve during builds
COPY adapters/shared ./adapters/shared

# Copy package files for the Solana adapter and install dependencies
WORKDIR /workspace/adapters/solana
COPY adapters/solana/package*.json ./
RUN npm install

# Copy source code
COPY adapters/solana/tsconfig.json ./
COPY adapters/solana/jest.config.json ./
COPY adapters/solana/src ./src
COPY adapters/solana/tests ./tests

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
WORKDIR /app/adapters/solana
COPY adapters/solana/package*.json ./
RUN npm install --omit=dev

# Copy built application from builder stage
COPY --from=builder /workspace/adapters/solana/dist ./dist

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
