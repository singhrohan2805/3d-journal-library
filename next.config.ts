import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Prevent the dev server from infinitely reloading when layout.json is modified
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/content/**'],
      };
    }
    return config;
  },
};

export default nextConfig;
