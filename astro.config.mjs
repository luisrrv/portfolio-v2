import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lrod.dev',
  build: {
    inlineStylesheets: 'always', // Inlines all CSS — eliminates render-blocking request
  },
  compressHTML: true,
  vite: {
    build: {
      cssMinify: true,
    },
  },
});