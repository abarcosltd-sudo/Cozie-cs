# syntax=docker/dockerfile:1.7

# ---------- build stage: compile the Vite + React app ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
# Prefer reproducible `npm ci`; fall back to `npm install` if the committed
# package-lock.json is out of sync with package.json. Regenerate the lockfile
# locally (`npm install`) and commit it to make builds fully reproducible.
RUN npm ci --no-audit --no-fund \
    || npm install --no-audit --no-fund

COPY . .

# Allow injecting Vite env vars at build time, e.g.
#   docker build --build-arg VITE_API_URL=https://api.example.com ...
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ---------- runtime stage: serve static files with nginx ----------
FROM nginx:1.27-alpine AS runtime

# SPA-friendly nginx config (history fallback to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
