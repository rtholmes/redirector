# --- build stage: all dependencies (TypeScript, types, test tools) and the compile ---
FROM node:24-alpine AS build

WORKDIR /app

# dependencies first, so source-only changes reuse this cached layer
COPY package.json  ./
COPY yarn.lock     ./
# clean the yarn cache in the same layer: it holds every platform's TypeScript binary (~1GB)
RUN yarn install --frozen-lockfile && yarn cache clean

COPY tsconfig.json ./
COPY src           ./src
RUN yarn build

# --- runtime stage: compiled output and production dependencies only ---
FROM node:24-alpine

WORKDIR /app

COPY package.json  ./
COPY yarn.lock     ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY views         ./views
COPY public        ./public
COPY --from=build /app/build ./build

# For local debugging, enable these two statements
# run with: docker run -p 3000:3000 redirector
#COPY .env          ./
#COPY data          ./data

CMD ["node", "./build/index.js"]
