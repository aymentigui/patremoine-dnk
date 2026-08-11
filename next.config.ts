import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: [
    'intercivic-rozella-unregrettably.ngrok-free.dev',
  ],
};

export default nextConfig;
