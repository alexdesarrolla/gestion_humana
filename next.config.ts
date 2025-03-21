import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Configuración específica para Cloudflare Pages
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.pages.dev', '*.workers.dev'],
    },
  },
};

export default nextConfig;
