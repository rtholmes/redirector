FROM node:14-alpine

WORKDIR /app

COPY src           ./src
COPY views         ./views
COPY tsconfig.json ./
COPY package.json  ./
COPY yarn.lock     ./

RUN yarn install
RUN yarn build

CMD ["node", "./build/index.js"]
