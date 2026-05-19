FROM node:18-alpine

# wget est nécessaire pour le healthcheck
RUN apk add --no-cache wget

WORKDIR /app

COPY backend/package.json .

RUN npm install

COPY backend/ .

EXPOSE 3000

CMD ["node", "index.js"]
