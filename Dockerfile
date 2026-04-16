# Use Node.js 20 as base
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Final stage
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/package*.json ./
# Install only production dependencies
RUN npm install --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./

# Install tsx globally or as dev dep to run server.ts
RUN npm install -g tsx

EXPOSE 3000

ENV NODE_ENV=production

CMD ["tsx", "server.ts"]
