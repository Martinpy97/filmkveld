FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run check && npm run build

FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
LABEL org.opencontainers.image.title="Min Pokedex" org.opencontainers.image.version="1.0.0" org.opencontainers.image.source="https://github.com/Martinpy97/filmkveld"
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8784 POKEDEX_DATA_DIR=/data
WORKDIR /app
COPY --from=build --chown=node:node /build/dist ./dist
COPY --chown=node:node migrations ./migrations
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8784
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 CMD node -e "fetch('http://127.0.0.1:8784/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.mjs"]
