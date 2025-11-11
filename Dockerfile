# Use Node.js 18 LTS
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app/backoffice-api

# Copy package files
COPY backoffice-api/package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app/backoffice-api

# Copy package files
COPY backoffice-api/package*.json ./
COPY backoffice-api/tsconfig*.json ./
COPY backoffice-api/nest-cli.json ./
COPY backoffice-api/src ./src

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app/backoffice-api

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/backoffice-api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/backoffice-api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/backoffice-api/package*.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/main.js || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]