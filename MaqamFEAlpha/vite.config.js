import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const proxyTarget =
    env.VITE_PROXY_TARGET || env.VITE_API_BASE_URL || env.VITE_API_URL_S || 'http://192.168.11.123:5001';

  return {
    plugins: [react(), tailwindcss()],

    envDir: process.cwd(),

    server: {
      host: '0.0.0.0',
      port: 5069,

      // Development only
      allowedHosts: true,

      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },

        '/webhook': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },

        '/health': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },

        '/restcountries': {
          target: 'https://restcountries.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/restcountries/, ''),
          secure: false,
        },
      },
    },

    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three')) return 'vendor-three';
              if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
              if (id.includes('leaflet')) return 'vendor-leaflet';
              if (id.includes('bootstrap')) return 'vendor-bootstrap';
              if (id.includes('framer-motion') || id.includes('animejs')) return 'vendor-motion';
              if (id.includes('lucide-react') || id.includes('react-icons')) return 'vendor-icons';
              if (id.includes('react-router')) return 'vendor-router';
              if (id.includes('@reduxjs') || id.includes('react-redux') || id.includes('@tanstack') || id.includes('zustand') || id.includes('axios')) {
                return 'vendor-state';
              }
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            }
          },
        },
      },
    },
  };
});
