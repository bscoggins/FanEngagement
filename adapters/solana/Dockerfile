FROM node:20-alpine AS builder
WORKDIR /app
COPY adapters/solana/package*.json ./
RUN npm ci
COPY adapters/solana/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY adapters/solana/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3001
USER node
CMD ["npm", "start"]
