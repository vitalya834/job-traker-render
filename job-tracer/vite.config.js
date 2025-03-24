import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Добавляем alias @
    },
  },
  plugins: [vue()],
  server: {
    // Добавлено, чтобы Vite слушал на 0.0.0.0 (а не только на localhost)
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        host: true, 
        // Если нужно убрать /api из запроса, можно раскомментировать следующую строку:
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
