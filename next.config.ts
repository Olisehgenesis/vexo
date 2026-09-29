import { config as dotenvx } from "@dotenvx/dotenvx";
import type { NextConfig } from "next";

const envFiles = (process.env.DOTENV_FILE ?? ".env,.env.local")
  .split(",")
  .map((file) => file.trim())
  .filter(Boolean);
dotenvx({ path: envFiles, overload: true });

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@nouns/assets", "@nouns/sdk"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "noun.pics" },
      { protocol: "https", hostname: "api.cloudnouns.com" },
    ],
  },
};

export default nextConfig;
