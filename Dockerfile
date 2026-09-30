FROM node:20-bookworm-slim AS dependencies

RUN npm install --global bun@1.3.12
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS build

COPY . .

# These values are intentionally public: Vite embeds them in the browser app.
ARG VITE_APP_URL
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_MICROSOFT_CLIENT_ID
ARG VITE_SENTRY_DSN
ENV VITE_APP_URL=$VITE_APP_URL \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_MICROSOFT_CLIENT_ID=$VITE_MICROSOFT_CLIENT_ID \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN bun run build

FROM node:20-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates chromium ffmpeg fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    CREATIVE_STUDIO_CHROMIUM_PATH=/usr/bin/chromium

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server/templates ./server/templates
COPY --from=build /app/client/public/attached_assets ./client/public/attached_assets

RUN mkdir -p /app/temp && chown -R node:node /app
USER node

EXPOSE 5000
CMD ["node", "dist/index.js"]
