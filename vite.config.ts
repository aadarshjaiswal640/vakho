import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const getApiTarget = () => {
  const env = process.env.VITE_API_URL;
  if (env) return env;
  return 'http://127.0.0.1:3001';
};

export default defineConfig({
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: getApiTarget(),
        changeOrigin: true,
        rewrite: (path) => path,
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@assets': path.resolve(__dirname, 'public/assets'),
    }
  },
  define: {
    'process.env': JSON.stringify(process.env)
  }
});
