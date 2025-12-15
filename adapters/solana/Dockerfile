FROM node:20-alpine AS builder
WORKDIR /app
COPY adapters/solana/package*.json ./
RUN npm ci
COPY adapters/solana/ .
RUN npm run build

FROM builder AS test
RUN npm test

FROM node:20-alpine AS production
WORKDIR /app
COPY adapters/solana/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3001
USER node
CMD ["npm", "start"]
