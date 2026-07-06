FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/docs ./src/docs
COPY --from=builder /app/src/modules ./src/modules
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
