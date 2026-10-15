import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Override to point the dev server at another backend (e.g. a test instance).
          '/api': process.env.API_PROXY_TARGET || 'http://localhost:3124',
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
});
