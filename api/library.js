// Vercel serverless function: persists the video library to Vercel Blob storage
// so it survives across devices and browser-cache clears on a deployed build.
//
// Locally (npm run dev) this file does NOT run — the Vite plugin in
// vite.config.js handles /api/library against a JSON file on disk instead.
//
// Required Vercel setup:
//   - Connect a Blob store to the project (adds BLOB_READ_WRITE_TOKEN env var).
//   - Set PORTAL_PASSWORD to the shared family password (enables the gate).
import { put, list } from '@vercel/blob'

const BLOB_KEY = 'library.json'

export default async function handler(req, res) {
  // Unauthenticated health probe: reports whether the cloud store is wired up,
  // without exposing any library data. Used to diagnose cross-device sync.
  if (req.method === 'GET' && /[?&]health/.test(req.url || '')) {
    res.status(200).json({
      hasBlob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      hasPassword: Boolean(process.env.PORTAL_PASSWORD),
    })
    return
  }

  // Password gate — only enforced when PORTAL_PASSWORD is configured.
  const expected = process.env.PORTAL_PASSWORD
  if (expected) {
    if (req.headers['x-portal-password'] !== expected) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
  }

  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: BLOB_KEY })
      const found = blobs.find((b) => b.pathname === BLOB_KEY)
      if (!found) {
        res.status(404).json({}) // nothing saved yet
        return
      }
      // Blob bodies are served from a CDN URL; fetch and relay the JSON.
      const upstream = await fetch(found.url, { cache: 'no-store' })
      const body = await upstream.text()
      res.setHeader('content-type', 'application/json')
      res.setHeader('cache-control', 'no-store')
      res.status(200).send(body)
      return
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      let body = ''
      for await (const chunk of req) body += chunk
      JSON.parse(body) // validate before persisting so we never store garbage
      await put(BLOB_KEY, body, {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false, // stable pathname so we can find it again
        allowOverwrite: true,
        cacheControlMaxAge: 0, // mutable doc — don't let the CDN serve a stale copy
      })
      res.status(204).end()
      return
    }

    res.status(405).end()
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
}
