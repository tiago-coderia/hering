FROM node:20-alpine AS base

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy root workspace and api package files
COPY package.json ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm install --workspace=apps/api

# Copy source and prisma schema
COPY apps/api ./apps/api

WORKDIR /app/apps/api

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Storage directory
RUN mkdir -p /app/storage/uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && tsx prisma/seed.ts && node dist/index.js"]

