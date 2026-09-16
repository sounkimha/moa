import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: process.env.CODESPACE_NAME
      ? [`${process.env.CODESPACE_NAME}-8090.app.github.dev`]
      : [],
    proxy: {
      '/api/admin': { target: 'http://127.0.0.1:4000', changeOrigin: false },
    },
  },
  preview: {
    proxy: { '/api/admin': { target: 'http://127.0.0.1:4000', changeOrigin: false } },
  },
});
