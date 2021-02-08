FROM node:14

WORKDIR /opt/wdglance

COPY . .
RUN npm ci

RUN npm start build:server
RUN npm start build:production
