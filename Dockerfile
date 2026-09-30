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

FROM dependencies AS runtime-dependencies

# The compiled server does not need Vite, TypeScript, Capacitor, or the other
# build-only packages. Keeping only production dependencies makes Railway's
# runtime image substantially smaller and faster to push between releases.
RUN rm -rf node_modules && bun install --frozen-lockfile --production

FROM node:20-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates chromium ffmpeg fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    CREATIVE_STUDIO_CHROMIUM_PATH=/usr/bin/chromium

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=runtime-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/package.json ./package.json
COPY --chown=node:node --from=build /app/server/templates ./server/templates
COPY --chown=node:node --from=build /app/client/public/attached_assets ./client/public/attached_assets

# Avoid recursively changing ownership across the full dependency tree. That
# step previously took Railway around twelve minutes on every image build.
RUN install -d -o node -g node /app/temp
USER node

EXPOSE 5000
CMD ["node", "dist/index.js"]
