FROM node:16

COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

CMD [ "node", "matcha.js" ]