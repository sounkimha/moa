FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/domain/package.json packages/domain/package.json

RUN npm ci

COPY . .

ARG EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY

RUN npm run build -w @moa/domain \
  && npm run build -w @moa/api \
  && npm run export -w @moa/mobile

FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV MOA_DEMO_PREVIEW=1
ENV MOA_SERVE_WEB=1

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/mobile/dist ./apps/mobile/dist
COPY --from=build /app/packages/domain ./packages/domain

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
