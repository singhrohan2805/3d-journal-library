import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/content/**', '**/node_modules/**'],
      };
    }
    return config;
  },
};

export default nextConfig;
