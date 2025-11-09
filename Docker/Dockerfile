# Multi-stage Dockerfile for Next.js production build
# Builds the app in a builder stage and creates a lightweight runtime image

FROM node:22-bullseye-slim AS builder
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install all dependencies (including dev deps needed for build)
RUN npm install

# Copy the rest of the source
COPY . .

# Build the Next.js app (uses script from package.json)
RUN npm run build

# Generate prisma client
RUN npx prisma generate

### Production image
FROM node:22-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built output and public folder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy package.json and node_modules from builder (fast and simple)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Use the existing start script which runs `next start`
CMD ["npm", "run", "start"]
