FROM node:20-alpine

WORKDIR /app

# Native deps pro better-sqlite3 a sharp
RUN apk add --no-cache python3 make g++ vips-dev

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Init DB + nasypat demo obsah (buildtime — data v ephemeral disku)
RUN npm run init-db && npm run seed-demo

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
