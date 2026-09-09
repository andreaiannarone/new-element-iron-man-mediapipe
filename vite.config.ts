import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('/three/examples/')) {
            return 'three-extras';
          }

          if (id.includes('/three/')) {
            return 'three-core';
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-vendor';
          }

          if (id.includes('/lucide-react/')) {
            return 'icons';
          }
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
});
