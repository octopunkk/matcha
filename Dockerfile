FROM node:16

WORKDIR /app

COPY package*.json ./

RUN apt-get update
RUN apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
RUN npm install

# Bundle app source
COPY src/ src
COPY migrations/ migrations

CMD [ "npm", "start" ]