import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.VITE_MINIMAX_API_KEY': JSON.stringify(env.VITE_MINIMAX_API_KEY),
      'process.env.MINIMAX_API_KEY': JSON.stringify(env.MINIMAX_API_KEY),
    },
    server: {
      port: 3000
    }
  };
});