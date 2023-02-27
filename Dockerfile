FROM node:14-alpine

WORKDIR /app

COPY src           ./src
COPY views         ./views
COPY public        ./public
COPY tsconfig.json ./
COPY package.json  ./
COPY yarn.lock     ./

# For local debugging, enable these two statements
# run with: docker run -p 3000:3000 redirector
# COPY .env          ./
# COPY data          ./data

RUN yarn install
RUN yarn build

CMD ["node", "./build/index.js"]
