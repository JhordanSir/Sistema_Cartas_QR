import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDirectory, "../..");

loadEnv({
  path: path.join(workspaceRoot, ".env"),
  override: false,
  quiet: true,
});

const apiInternalUrl = (process.env.API_INTERNAL_URL ?? "http://api:3001").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ["@sirio/shared"],
  async rewrites() {
    return [
      {
        source: "/api/health",
        destination: `${apiInternalUrl}/health`,
      },
      {
        source: "/api/health/:path*",
        destination: `${apiInternalUrl}/health/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
