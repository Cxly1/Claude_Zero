// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://cxly1.github.io',
  base: '/Claude_Zero',
  
  // View Transitions API habilitado globalmente
  prefetch: true,
  
  vite: {
    css: {
      devSourcemap: true
    },
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'webgl': ['ogl']
          }
        }
      }
    }
  },
  
  // Optimización de assets
  compressHTML: true,
  
  build: {
    inlineStylesheets: 'auto'
  }
});
