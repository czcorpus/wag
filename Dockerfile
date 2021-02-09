FROM node:14

WORKDIR /opt/wag

COPY . .
RUN npm ci

RUN npm start build:server
RUN npm start build:production
