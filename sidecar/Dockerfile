FROM docker.io/library/node:22-bookworm

WORKDIR /app
COPY package.json ./
RUN npm install

# Real Google Chrome is required — Playwright/Patchright's bundled Chromium
# gets detected by X regardless of headers/UA (see SETUP_SIDECAR.md). This
# installs Chrome plus whatever system libs it needs to run in this image.
RUN npx patchright install --with-deps chrome

# Wildcard, not an explicit file list — we've already been bitten once by a
# forgotten COPY entry for a new .mjs file silently crash-looping the
# container in production (ERR_MODULE_NOT_FOUND) with no build-time warning.
COPY *.mjs ./

EXPOSE 8080
CMD ["node", "server.mjs"]
