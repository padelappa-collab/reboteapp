import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true, // permite abrir la app desde el celular en la red local
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Las pruebas de paridad consultan la base de verdad, una ida y vuelta por
    // caso. Con los 5 segundos de serie, un rato de red lenta hace fallar casos
    // sueltos y distintos en cada corrida: parece un error de lógica y no lo es.
    testTimeout: 30000,
  },
})
