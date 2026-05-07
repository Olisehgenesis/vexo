import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence the "webpack config but no turbopack config" error.
  // XMTP's wasm bindings work with Turbopack's built-in wasm support.
  turbopack: {},
};

export default nextConfig;
