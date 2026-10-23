FROM node:20-alpine AS runner

WORKDIR /app

# Copy root workspace and web package files
COPY package.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install --workspace=apps/web

# Copy web source
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NODE_ENV=production

WORKDIR /app/apps/web

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]

