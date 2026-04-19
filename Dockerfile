FROM node:18 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
RUN npm install --omit=dev --ignore-scripts
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000
CMD ["node", "dist/production.js"]
