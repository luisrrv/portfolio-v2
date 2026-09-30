import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lrod.dev',
  build: {
    inlineStylesheets: 'always', // Inlines all CSS — eliminates render-blocking request
  },
  compressHTML: true,
  markdown: {
    // Token colors come from --astro-code-* variables in global.css,
    // so code blocks use the site palette instead of a stock theme.
    shikiConfig: { theme: 'css-variables', wrap: false },
  },
  vite: {
    build: {
      cssMinify: true,
    },
	server: {
      allowedHosts: ['.ngrok-free.app'],
    },
  },
});