FROM node:20-alpine

WORKDIR /app

# Copy deps first for layer caching
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4000

CMD ["node", "server.js"]
