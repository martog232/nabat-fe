# Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Baked into the bundle, not read at run time: Vite substitutes import.meta.env during
# the build, so the API host has to be known here. Default is Kong, per .env.example.
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ARG VITE_WS_BASE=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_BASE=$VITE_WS_BASE
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Outside conf.d/, which nginx.conf globs into the http block — this file is a fragment
# of add_header directives and is included by hand into each location that needs it.
# It ships as a template because its connect-src depends on where the API lives; the
# stock entrypoint expands it into /etc/nginx/ before nginx starts.
COPY security-headers.conf /etc/nginx/templates/security-headers.conf.template
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx
# The same base the bundle was built against, kept for the CSP. Carried, not repeated:
# 15-csp-connect-src.envsh derives the origins to allow from it.
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ARG VITE_WS_BASE=
ENV API_BASE_URL=$VITE_API_BASE_URL
ENV WS_BASE_URL=$VITE_WS_BASE
COPY docker-entrypoint.d/15-csp-connect-src.envsh /docker-entrypoint.d/15-csp-connect-src.envsh
# Sourced only if executable, and the bit does not survive a checkout on Windows.
RUN chmod +x /docker-entrypoint.d/15-csp-connect-src.envsh
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
