FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM base AS run
ENV NODE_ENV=production \
    TZ=Europe/Bucharest \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Imaginea păstrează scripturile și datele de seed: la pornire se aplică migrările și se completează
# ce lipsește (bucătăria, produsele, rețetele), fără să atingă ce ai modificat.
COPY --from=build /app ./
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:seed && pnpm start"]
