FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy source
COPY . .

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js && npm start"]
