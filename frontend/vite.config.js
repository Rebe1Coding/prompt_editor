import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Бэкенд без CORS: дев-сервер проксирует /api на FastAPI, прозрачно пробрасывая SSE.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:1488',
        changeOrigin: true,
      },
    },
  },
});
