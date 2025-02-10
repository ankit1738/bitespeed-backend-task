FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_PATH=./build






