import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: '/',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        bypass(req) {
          if (req.url) {
            const urlWithoutQuery = req.url.split('?')[0];
            if (urlWithoutQuery.endsWith('.ts') || urlWithoutQuery.endsWith('.tsx')) {
              return req.url;
            }
          }
        },
      },
    },
  },
});
