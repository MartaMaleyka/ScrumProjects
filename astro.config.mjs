// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Habilitar SSR para rutas dinámicas y autenticación
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
      // Pasar API_URL explícitamente para que esté disponible en SSR
      'process.env.API_URL': JSON.stringify(process.env.API_URL || 'http://localhost:3001')
    },
    server: {
      host: true,
      // Permitir hosts de Cloudflare Tunnel
      allowedHosts: [
        'okay-shoppers-elder-transparency.trycloudflare.com',
        'localhost',
        '127.0.0.1'
      ],
      proxy: {
        '/api': {
          target: (process.env.API_URL && process.env.API_URL.startsWith('http')) 
            ? process.env.API_URL 
            : 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        }
      }
    }
  }
});
