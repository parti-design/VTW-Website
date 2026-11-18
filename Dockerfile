# Build the static site with Node, then serve dist/ with nginx. Nothing from the build
# stage survives into the image that runs: no Node, no node_modules, no source.
# Same shape as the other Parti sites on Coolify (parti-design/Parti-Design).

# Debian, not Alpine, for the build: on musl, Rollup's native parser runs out of stack
# on Astro's own code ("Code is nested too deeply") at least on arm64. The build stage
# is thrown away, so its size does not matter.
FROM node:24-slim AS build
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# The commit being deployed, for <meta name="edit:commit">: the visual editor watches
# for it to know a publish is live. Coolify passes it when the resource has "Include
# Source Commit in Build" switched on. .git is not in the build context, so without it
# the tag is empty and the editor falls back to edit.json's typical deploy time.
# Declared after the install so a new commit does not invalidate the dependency layer.
ARG SOURCE_COMMIT
ENV SOURCE_COMMIT=$SOURCE_COMMIT

# Fail the image rather than ship a half-built site.
RUN pnpm build \
 && test -f dist/index.html \
 && test -f dist/404.html \
 && test -f dist/sitemap.xml \
 && test -f dist/assets/css/main.css


FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.inc /etc/nginx/conf.d/security-headers.inc
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# 127.0.0.1, not localhost: inside the container localhost resolves to ::1 first,
# nginx listens on IPv4 only, and the check would fail while the site serves fine.
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
