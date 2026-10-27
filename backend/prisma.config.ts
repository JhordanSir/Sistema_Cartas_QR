import { config as loadEnv } from "dotenv";

import { defineConfig, env } from "prisma/config";

// The only .env lives at the workspace root, one level above this package.
loadEnv({ path: new URL("../.env", import.meta.url), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
