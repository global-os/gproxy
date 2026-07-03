FROM docker.io/library/node:22-bookworm

WORKDIR /app
COPY package.json ./
RUN npm install

# Real Google Chrome is required — Playwright/Patchright's bundled Chromium
# gets detected by X regardless of headers/UA (see SETUP_SIDECAR.md). This
# installs Chrome plus whatever system libs it needs to run in this image.
RUN npx patchright install --with-deps chrome

COPY server.mjs mitm-proxy.mjs ./

EXPOSE 8080
CMD ["node", "server.mjs"]
