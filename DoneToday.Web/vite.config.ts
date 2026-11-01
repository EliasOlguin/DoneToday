import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Vite's default SPA fallback is index.html; application routes use their own shell.
const appShell = () => {
  const middleware = (req: { url?: string; headers: { accept?: string } }, _res: unknown, next: () => void) => {
    const path = req.url?.split('?')[0] ?? '/'
    if (req.headers.accept?.includes('text/html') &&
        path !== '/' && path !== '/index.html' &&
        !/^\/(es|de)(\/|\/index\.html)?$/.test(path) &&
        !path.startsWith('/api/') && !path.split('/').pop()?.includes('.')) {
      req.url = '/app.html'
    }
    next()
  }
  return {
    name: 'application-shell',
    configureServer(server: { middlewares: { use: (handler: typeof middleware) => void } }) { server.middlewares.use(middleware) },
    configurePreviewServer(server: { middlewares: { use: (handler: typeof middleware) => void } }) { server.middlewares.use(middleware) },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [appShell(), react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        es: resolve(import.meta.dirname, 'es/index.html'),
        de: resolve(import.meta.dirname, 'de/index.html'),
        app: resolve(import.meta.dirname, 'app.html'),
      },
    },
  },
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
