import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 6000,
    minify: false, // Fast, reliable build without esbuild memory exhaustion on 5MB bundle
    rollupOptions: {
      output: {
        manualChunks: {
          plotly: ['plotly.js-dist-min'],
          three: ['three'],
        },
      },
    },
  },
});
