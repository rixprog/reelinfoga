# One image, two runtimes. The Next.js routes spawn the Python CLI as a
# subprocess, so both have to live in the same container — splitting them would
# mean rewriting the Python side as a service, which is a bigger change than
# this project needs.
#
# Both runtimes come from official images rather than `apt-get install python3`
# on top of node. apt talks to deb.debian.org over plain HTTP on port 80, which
# ISP-level DNS interception and corporate proxies routinely break — one
# teammate hit exactly that and could not build at all. Docker Hub, PyPI and the
# npm registry are all HTTPS and pass through those networks untouched, so
# copying Node out of its official image removes the only fragile hop.
FROM node:22-bookworm-slim AS node

FROM python:3.11-slim-bookworm

# Same Debian release as the node image above, so the binary finds the glibc and
# libstdc++ it was linked against.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /app

# Dependencies before source: these layers survive a code change, and rebuilding
# them costs minutes. ffmpeg arrives inside the imageio-ffmpeg wheel, so there is
# no system package to install for it.
COPY requirements.txt ./
RUN python3 -m venv .venv && .venv/bin/pip install --no-cache-dir -r requirements.txt

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The venv lands at the default .venv/bin/python that resolvePython() looks for,
# so REELBRAIN_PYTHON stays unset and the container matches local dev exactly.
RUN npm run build

# The extracted library. Declared so it survives `docker compose down` even if
# the bind mount in compose.yaml is removed.
VOLUME ["/app/out"]

EXPOSE 3000
CMD ["npm", "start"]
