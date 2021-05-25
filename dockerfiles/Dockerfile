FROM node:16

WORKDIR /opt/wag

COPY ./package.json ./package-lock.json ./
RUN npm ci

COPY . .
RUN npm start build:server
RUN npm start build:production

CMD [ "npm", "start", "server" ]
