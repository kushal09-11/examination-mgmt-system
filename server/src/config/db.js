const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');

let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  databaseUrl = 'postgresql://postgres:postgres@172.25.73.12:5432/ems_db?schema=public';
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
