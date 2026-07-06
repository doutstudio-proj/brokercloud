import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Adicionado para suportar Ngrok e Localtunnel no dev mode
  serverExternalPackages: ['@prisma/client', 'pdfkit'],
  // Permite qualquer subdomínio do loca.lt e ngrok para o HMR do Next.js
  allowedDevOrigins: [
    'tidy-islands-rescue.loca.lt',
    '*.loca.lt',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.trycloudflare.com',
    '*.free.pinggy.net',
    'localhost:3000'
  ]
};

export default nextConfig;
