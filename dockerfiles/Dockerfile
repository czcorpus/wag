FROM node:16

WORKDIR /opt/wag

COPY build.js ./build.js
COPY assets ./assets
COPY conf ./conf
COPY src ./src
COPY test ./test
COPY launcher-config.json ./launcher-config.json
COPY launcher-menu.json ./launcher-menu.json
COPY webpack.prod.js ./webpack.prod.js
COPY webpack.server.js ./webpack.server.js
COPY tsconfig.json ./tsconfig.json
COPY tsconfig.server.json ./tsconfig.server.json
COPY ./package.json ./package-lock.json ./
RUN npm ci
ENV NODE_ENV production
RUN mkdir ./dist
RUN mkdir ./dist/.compiled
RUN npm start build:production