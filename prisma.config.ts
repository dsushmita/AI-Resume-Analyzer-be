import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 takes the migrate/introspect connection URL from here, not from schema.prisma
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
