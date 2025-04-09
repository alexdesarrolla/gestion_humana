/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://aqmlxjsyczqtfansvnqr.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbWx4anN5Y3pxdGZhbnN2bnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MzM3NTYsImV4cCI6MjA1ODUwOTc1Nn0._dfB0vDYrR4jQ1cFHPXr_6iGTUXctzTeZbIcE4FJ0lk'
  },
  async exportPathMap(defaultPathMap) {
    const paths = {
      '/administracion/comunicados/editar/[id]': { page: '/administracion/comunicados/editar/[id]' }
    };
    return { ...defaultPathMap, ...paths };
  }
};

module.exports = nextConfig;
