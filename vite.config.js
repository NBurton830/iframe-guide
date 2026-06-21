import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
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
    // Mirror the deployed password gate. Off by default locally; set
    // PORTAL_PASSWORD to test the lock screen against `npm run dev`.
    const expected = process.env.PORTAL_PASSWORD
    if (expected && req.headers['x-portal-password'] !== expected) {
      res.statusCode = 401
      res.end(JSON.stringify({ error: 'unauthorized' }))
      return
    }
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
  plugins: [react(), tailwindcss(), libraryApi()],
})
