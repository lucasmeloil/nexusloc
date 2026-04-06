import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Oculta o código fonte original no F12 em produção
    minify: 'esbuild', // Reduz e ofusca o código
    chunkSizeWarningLimit: 1600,
  }
})
