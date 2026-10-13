import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    https:
      command === 'serve'
        ? {
            cert: readFileSync(
              new URL('../.local/https/localhost.pem', import.meta.url),
            ),
            key: readFileSync(
              new URL('../.local/https/localhost.key', import.meta.url),
            ),
          }
        : undefined,
    proxy: {
      '/api': {
        target: process.env.DONETODAY_API_URL ?? 'https://localhost:7154',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}))
