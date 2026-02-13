// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(), 
    tailwind({
      applyBaseStyles: false, // Ya tenemos global.css
    })
  ],
  server: {
    port: parseInt(process.env.PORT || '4321'),
    host: true
  },
  vite: {
    define: {
      'process.env': {}
    },
    server: {
      proxy: {
        '/api': {
          target: process.env.API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
});
