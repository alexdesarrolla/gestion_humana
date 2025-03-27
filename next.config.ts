import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
  // Configuración para la generación estática
  // Nota: En lugar de exportPathMap, se debe usar generateStaticParams() en las páginas
  // que requieren generación estática dentro del directorio app
};

export default nextConfig;
