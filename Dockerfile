FROM node:24-alpine

WORKDIR /app

COPY src           ./src
COPY views         ./views
COPY public        ./public
COPY tsconfig.json ./
COPY package.json  ./
COPY yarn.lock     ./

# For local debugging, enable these two statements
# run with: docker run -p 3000:3000 redirector
#COPY .env          ./
#COPY data          ./data

# clean the yarn cache in the same layer: it holds every platform's TypeScript binary (~1GB)
RUN yarn install --frozen-lockfile && yarn cache clean
RUN yarn build

CMD ["node", "./build/index.js"]
