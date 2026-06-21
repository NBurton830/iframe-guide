import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.resolve(__dirname, 'data/library.json')

// Tiny file-backed persistence API so the library survives browser-cache clears.
// GET  /api/library  -> current library.json (404 if not created yet)
// POST /api/library  -> overwrite library.json with the request body
function libraryApi() {
  const handler = async (req, res) => {
    try {
      if (req.method === 'GET') {
        const data = await fs.readFile(DATA_FILE, 'utf8')
        res.setHeader('content-type', 'application/json')
        res.end(data)
      } else if (req.method === 'POST' || req.method === 'PUT') {
        let body = ''
        for await (const chunk of req) body += chunk
        JSON.parse(body) // validate before writing so we never persist garbage
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
        await fs.writeFile(DATA_FILE, body)
        res.statusCode = 204
        res.end()
      } else {
        res.statusCode = 405
        res.end()
      }
    } catch (err) {
      // Missing file on GET is expected the very first run.
      if (req.method === 'GET' && err.code === 'ENOENT') {
        res.statusCode = 404
        res.end('{}')
      } else {
        res.statusCode = 500
        res.end(String(err))
      }
    }
  }

  return {
    name: 'library-api',
    configureServer(server) {
      server.middlewares.use('/api/library', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/library', handler)
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    libraryApi(),
    // Emit transpiled + polyfilled bundles (with a nomodule fallback) so the
    // app runs on old Chrome/Android that can't parse modern ES modules.
    legacy({
      targets: ['defaults', 'chrome >= 60', 'safari >= 11'],
      // core-js (auto-injected) covers ES features, but NOT fetch — it's a
      // browser API. Old browsers without native fetch crash without this.
      additionalLegacyPolyfills: ['regenerator-runtime/runtime', 'whatwg-fetch'],
    }),
  ],
  server: {
    watch: {
      // The app writes the saved library here; without this, every save would
      // trip Vite's file watcher and full-reload the page in an endless loop.
      ignored: ['**/data/**'],
    },
  },
})
