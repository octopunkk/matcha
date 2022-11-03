FROM node:16

WORKDIR /app

COPY package*.json ./

RUN npm install

# Bundle app source
COPY src/ src
COPY migrations/ migrations

CMD [ "npm", "start" ]