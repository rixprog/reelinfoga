# One image, two runtimes. The Next.js routes spawn the Python CLI as a
# subprocess, so both have to live in the same container — splitting them would
# mean rewriting the Python side as a service, which is a bigger change than
# this project needs.
FROM node:22-bookworm-slim

# ffmpeg arrives via the imageio-ffmpeg wheel, so there is no apt install for it.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies before source: these layers survive a code change, and rebuilding
# them costs minutes.
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
