FROM node:14-alpine

WORKDIR /opt/app

COPY package.json package-lock.json ./

RUN npm install 

RUN npm ci --production

COPY . . 

ENV PORT=5000

EXPOSE 5000

VOLUME /opt/app/server-data

CMD ["npm","start"]