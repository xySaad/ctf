FROM node:alpine

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    supervisor \
    openssl \
    build-base

RUN mkdir -p /app

COPY index.js bot.js flag.txt /app

WORKDIR /app
RUN npm init -y
RUN npm install express cookie-parser puppeteer

EXPOSE 3000

ENTRYPOINT ["node", "index.js"]
