FROM node:20 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

# Bundle the AWS RDS global CA so the app can verify Postgres server certs
# (replaces NODE_TLS_REJECT_UNAUTHORIZED=0). Cached layer; updated CA bundles
# are released by AWS at this stable URL.
RUN apk add --no-cache ca-certificates curl \
 && curl -fsSL -o /etc/ssl/rds-global-bundle.pem \
      https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
 && apk del curl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/templates ./server/templates
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000
ENV RDS_CA_BUNDLE_PATH=/etc/ssl/rds-global-bundle.pem
CMD ["node", "dist/production.js"]
