import { defineConfig } from 'drizzle-kit';

// Only `drizzle-kit generate` is used: Netlify applies the SQL files in
// netlify/database/migrations on deploy, and `netlify database migrations apply`
// applies them locally. There are deliberately no dbCredentials, so `push` and
// `migrate` cannot reach any database by accident.
export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './netlify/database/migrations',
});
