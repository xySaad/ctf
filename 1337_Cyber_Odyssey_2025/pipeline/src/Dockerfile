# Base stage
FROM node:22-alpine AS base
WORKDIR /srv
RUN npm install -g npm

# App stage
FROM base AS app-build
COPY app/package.json ./
RUN npm install --omit=dev
COPY app/src ./src
COPY app/FLAG.txt ./

# Proxy stage
FROM base AS proxy-build
COPY proxy/package.json ./
RUN npm install --omit=dev
COPY proxy/server.js ./

# Final stage - all services
FROM node:22-alpine
# Install supervisor, curl (for health/debug), and tini for proper PID1 signal handling
RUN apk add --no-cache supervisor curl ca-certificates tini

# Create log directory
RUN mkdir -p /var/log

# Create directories for each service
RUN mkdir -p /srv/app /srv/metadata /srv/proxy

# Copy app
COPY --from=app-build /srv /srv/app
# Copy proxy
COPY --from=proxy-build /srv /srv/proxy

# Verify directories exist and have content
RUN ls -la /srv/app && ls -la /srv/proxy

# Create supervisor config
RUN mkdir -p /etc/supervisor/conf.d
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8082

# Use tini as PID 1 for correct signal handling and reaping of zombies
ENTRYPOINT ["/sbin/tini", "-g", "--", "/entrypoint.sh"]
