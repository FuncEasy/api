FROM node:10
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN mkdir /uploadScripts
COPY presetTemplate/ ./presetTemplate
COPY src/ ./src
WORKDIR /usr/src/app/src
CMD ["node", "app.js"]