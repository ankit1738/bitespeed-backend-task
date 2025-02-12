FROM node:22-alpine3.20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_PATH=./build

EXPOSE 3000

CMD [ "npm", "start" ]